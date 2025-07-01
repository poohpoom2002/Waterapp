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
        Schema::create('pipes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('field_id')->constrained('fields')->onDelete('cascade');
            $table->foreignId('field_zone_id')->nullable()->constrained('field_zones')->onDelete('set null');
            $table->enum('type', ['main', 'submain', 'branch']);
            $table->enum('direction', ['horizontal', 'vertical']);
            $table->decimal('start_latitude', 10, 8);
            $table->decimal('start_longitude', 11, 8);
            $table->decimal('end_latitude', 10, 8);
            $table->decimal('end_longitude', 11, 8);
            $table->decimal('length', 10, 2); // in meters
            $table->integer('plants_served');
            $table->decimal('water_flow', 10, 2); // L/day
            $table->integer('pipe_diameter'); // in mm
            $table->integer('row_index')->nullable();
            $table->integer('col_index')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pipes');
    }
};
