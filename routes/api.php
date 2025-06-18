<?php

use App\Http\Controllers\FarmController;
use App\Http\Controllers\Api\SprinklerController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\SprinklerProductController;


Route::post('/chat', [ChatController::class, 'chat']);

  


Route::post('/generate-planting-points', [FarmController::class, 'generatePlantingPoints']);
Route::get('/sprinklers', [SprinklerController::class, 'index']);
Route::post('/calculate-pipe-layout', [SprinklerController::class, 'calculatePipeLayout']);


Route::apiResource('/sprinkler-products', SprinklerProductController::class); 
Route::post('/generate-pipe-layout', [FarmController::class, 'generatePipeLayout']);
