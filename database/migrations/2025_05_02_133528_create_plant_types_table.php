<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('plant_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type');
            $table->float('plant_spacing')->comment('Space between plants in a row (meters)');
            $table->float('row_spacing')->comment('Space between rows (meters)');
            $table->float('water_needed')->comment('Water needed per plant (liters)');
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plant_types');
    }
};
