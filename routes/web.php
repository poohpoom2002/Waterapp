<?php
// routes\web.php
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProfilePhotoController;
use App\Http\Controllers\SuperUserController;
use App\Http\Controllers\FarmController; // เพิ่มบรรทัดนี้

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

// Test route to check if web routes are working
Route::get('/test-web', function () {
    return response()->json(['message' => 'Web route is working']);
});

// Test authentication route
Route::get('/test-auth', function () {
    $user = auth()->user();
    if ($user) {
        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_super_user' => $user->isSuperUser(),
            ],
            'session_id' => session()->getId(),
        ]);
    } else {
        return response()->json([
            'success' => false,
            'message' => 'Not authenticated',
            'session_id' => session()->getId(),
        ]);
    }
});

// Folder Management Routes - Added to web routes to avoid API middleware issues
Route::get('/folders-api', function () {
    try {
        $user = auth()->user();
        
        // Debug logging
        \Log::info('Folders API called', [
            'user' => $user ? $user->id : 'null',
            'session_id' => session()->getId(),
            'headers' => request()->headers->all()
        ]);
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required',
                'debug' => [
                    'session_id' => session()->getId(),
                    'has_user' => auth()->check()
                ]
            ], 401);
        }

        // Fetch real folders from database
        $folders = \App\Models\Folder::where('user_id', $user->id)
            ->orderBy('name')
            ->get();

        // Create default system folders if they don't exist
        $systemFolders = [
            ['name' => 'Finished', 'type' => 'finished', 'color' => '#10b981', 'icon' => '✅'],
            ['name' => 'Unfinished', 'type' => 'unfinished', 'color' => '#f59e0b', 'icon' => '⏳'],
        ];

        foreach ($systemFolders as $systemFolder) {
            $exists = $folders->where('name', $systemFolder['name'])->first();
            if (!$exists) {
                \App\Models\Folder::create(array_merge($systemFolder, [
                    'user_id' => $user->id,
                ]));
            }
        }

        // Refresh the folders list
        $folders = \App\Models\Folder::where('user_id', $user->id)
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'folders' => $folders->map(function ($folder) {
                // Calculate total field count including sub-folders recursively
                $calculateTotalFieldCount = function($folder) use (&$calculateTotalFieldCount) {
                    $directCount = $folder->fields()->count();
                    
                    // Get all sub-folders recursively
                    $subFolders = \App\Models\Folder::where('parent_id', $folder->id)->get();
                    $subFolderCount = 0;
                    
                    foreach ($subFolders as $subFolder) {
                        $subFolderCount += $calculateTotalFieldCount($subFolder);
                    }
                    
                    $totalCount = $directCount + $subFolderCount;
                    
                    // Debug logging
                    \Log::info("Folder: {$folder->name}, Direct: {$directCount}, Sub-folders: {$subFolderCount}, Total: {$totalCount}");
                    
                    return $totalCount;
                };
                
                $totalFieldCount = $calculateTotalFieldCount($folder);
                
                return [
                    'id' => $folder->id,
                    'name' => $folder->name,
                    'type' => $folder->type,
                    'color' => $folder->color ?? '#6366f1',
                    'icon' => $folder->icon ?? '📁',
                    'parent_id' => $folder->parent_id,
                    'field_count' => $totalFieldCount,
                    'created_at' => $folder->created_at,
                    'updated_at' => $folder->updated_at,
                ];
            })
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error fetching folders: ' . $e->getMessage()
        ], 500);
    }
});

Route::post('/folders-api', function (\Illuminate\Http\Request $request) {
    try {
        $user = auth()->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required'
            ], 401);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:finished,unfinished,custom,customer,category',
            'parent_id' => 'nullable|exists:folders,id',
            'color' => 'nullable|string|max:7',
            'icon' => 'nullable|string|max:10',
        ]);

        $folder = \App\Models\Folder::create(array_merge($validated, [
            'user_id' => $user->id,
        ]));

        return response()->json([
            'success' => true,
            'folder' => [
                'id' => $folder->id,
                'name' => $folder->name,
                'type' => $folder->type,
                'color' => $folder->color ?? '#6366f1',
                'icon' => $folder->icon ?? '📁',
                'parent_id' => $folder->parent_id,
                'field_count' => 0,
                'created_at' => $folder->created_at,
                'updated_at' => $folder->updated_at,
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error creating folder: ' . $e->getMessage()
        ], 500);
    }
});

// Delete folder route
Route::delete('/folders-api/{folderId}', function ($folderId) {
    try {
        $user = auth()->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required'
            ], 401);
        }

        // Check if folderId is numeric
        if (!is_numeric($folderId)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid folder ID'
            ], 400);
        }

        $folder = \App\Models\Folder::where('user_id', $user->id)
            ->findOrFail($folderId);

        // Check if it's a system folder (cannot be deleted)
        if ($folder->isSystemFolder()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete system folders'
            ], 400);
        }

        // Check if folder has fields
        if ($folder->fields()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete folder that contains fields'
            ], 400);
        }

        $folder->delete();

        return response()->json([
            'success' => true,
            'message' => 'Folder deleted successfully'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error deleting folder: ' . $e->getMessage()
        ], 500);
    }
});

// Alternative delete folder route using POST (for CSRF compatibility)
Route::post('/folders-api/{folderId}/delete', function ($folderId) {
    try {
        $user = auth()->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required'
            ], 401);
        }

        // Check if folderId is numeric
        if (!is_numeric($folderId)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid folder ID'
            ], 400);
        }

        $folder = \App\Models\Folder::where('user_id', $user->id)
            ->findOrFail($folderId);

        // Check if it's a system folder (cannot be deleted)
        if ($folder->isSystemFolder()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete system folders'
            ], 400);
        }

        // Check if folder has fields
        if ($folder->fields()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete folder that contains fields'
            ], 400);
        }

        $folder->delete();

        return response()->json([
            'success' => true,
            'message' => 'Folder deleted successfully'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error deleting folder: ' . $e->getMessage()
        ], 500);
    }
});

// Fields API Routes - Added to web routes to avoid FarmController issues
Route::get('/fields-api', function () {
    try {
        $user = auth()->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required'
            ], 401);
        }

        // Fetch real fields from database with limit to avoid memory issues
        $fields = \App\Models\Field::where('user_id', $user->id)
            ->with('plantType')
            ->orderBy('id', 'desc') // Use ID instead of created_at for better performance
            ->limit(100) // Add limit to prevent memory issues
            ->get();

        return response()->json([
            'success' => true,
            'fields' => $fields->map(function ($field) {
                return [
                    'id' => $field->id,
                    'name' => $field->name,
                    'customerName' => $field->customer_name,
                    'userName' => $field->user_name,
                    'category' => $field->category,
                    'folderId' => $field->folder_id,
                    'status' => $field->status,
                    'isCompleted' => $field->is_completed,
                    'area' => is_string($field->area_coordinates) ? json_decode($field->area_coordinates, true) ?? [] : ($field->area_coordinates ?? []),
                    'plantType' => $field->plantType ? [
                        'id' => $field->plantType->id,
                        'name' => $field->plantType->name,
                        'type' => $field->plantType->type,
                        'plant_spacing' => $field->plantType->plant_spacing,
                        'row_spacing' => $field->plantType->row_spacing,
                        'water_needed' => $field->plantType->water_needed,
                    ] : null,
                    'totalPlants' => $field->total_plants,
                    'totalArea' => $field->total_area,
                    'total_water_need' => $field->total_water_need,
                    'createdAt' => $field->created_at,
                    'layers' => $field->layers ? (is_string($field->layers) ? json_decode($field->layers, true) : $field->layers) : [],
                ];
            })
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error fetching fields: ' . $e->getMessage()
        ], 500);
    }
});

Route::middleware(['auth', 'verified'])->group(function () {
    // Route::get('dashboard', function () {
    //     return Inertia::render('dashboard');
    // })->name('dashboard');

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
    
    // Folder Management Routes
    Route::get('/api/folders', [FarmController::class, 'getFolders'])->name('get-folders');
    Route::post('/api/folders', [FarmController::class, 'createFolder'])->name('create-folder');
    Route::put('/api/folders/{folderId}', [FarmController::class, 'updateFolder'])->name('update-folder');
    Route::delete('/api/folders/{folderId}', [FarmController::class, 'deleteFolder'])->name('delete-folder');
    
    // Field Status Management
    Route::put('/api/fields/{fieldId}/status', [FarmController::class, 'updateFieldStatus'])->name('update-field-status');
    Route::put('/api/fields/{fieldId}/folder', [FarmController::class, 'updateFieldFolder'])->name('update-field-folder');
    
    // Profile Photo Routes
    Route::post('/api/profile-photo/upload', [ProfilePhotoController::class, 'upload'])->name('profile-photo.upload');
    Route::delete('/api/profile-photo/delete', [ProfilePhotoController::class, 'delete'])->name('profile-photo.delete');
  
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
