<?php

use App\Http\Controllers\FarmController;
use App\Http\Controllers\Api\SprinklerController;

Route::post('/generate-planting-points', [FarmController::class, 'generatePlantingPoints']);
Route::get('/sprinklers', [SprinklerController::class, 'index']);
Route::post('/calculate-pipe-layout', [SprinklerController::class, 'calculatePipeLayout']);