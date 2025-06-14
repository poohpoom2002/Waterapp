<?php

use App\Http\Controllers\FarmController;
use App\Http\Controllers\Api\SprinklerController;
use App\Http\Controllers\ChatController;

// ใหม่ (เรียกเมธอด chat ตามที่คุณเขียนไว้)
Route::post('/chat', [ChatController::class, 'chat']);
Route::get('/ping', function(){
    return response()->json(['pong' => true]);
  });
  


Route::post('/generate-planting-points', [FarmController::class, 'generatePlantingPoints']);
Route::get('/sprinklers', [SprinklerController::class, 'index']);
Route::post('/calculate-pipe-layout', [SprinklerController::class, 'calculatePipeLayout']);