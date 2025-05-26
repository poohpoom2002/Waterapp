<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\FarmController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::get('planner', [FarmController::class, 'planner'])->name('planner');
    Route::get('generate-tree', [FarmController::class, 'generateTree'])->name('generateTree');
    Route::get('/api/plant-types', [FarmController::class, 'getPlantTypes']);
    Route::post('/api/generate-planting-points', [FarmController::class, 'generatePlantingPoints']);
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/api.php';
