<?php

use App\Http\Controllers\FarmController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PlantTypeController;

Route::post('/generate-planting-points', [FarmController::class, 'generatePlantingPoints']);

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::get('/plant-types', [PlantTypeController::class, 'index']);