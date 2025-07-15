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
        Schema::create('fields', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('customer_name')->nullable(); // Add customer name field
            $table->foreignId('user_id')->constrained('users'); // Add user relationship
            $table->text('area_coordinates'); // JSON array of lat/lng coordinates
            $table->foreignId('plant_type_id')->constrained('plant_types');
            $table->integer('total_plants');
            $table->decimal('total_area', 10, 2); // in rai
            $table->decimal('total_water_need', 10, 2); // L/day
            $table->string('area_type')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fields');
    }
};
