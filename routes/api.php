<?php

use App\Http\Controllers\FarmController;

Route::post('/generate-planting-points', [FarmController::class, 'generatePlantingPoints']);