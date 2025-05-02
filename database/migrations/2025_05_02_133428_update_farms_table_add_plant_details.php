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
        Schema::table('farms', function (Blueprint $table) {
            // Drop the old space column
            $table->dropColumn('space');
            
            // Add new columns
            $table->string('plant_type')->after('plant_name');
            $table->float('plant_spacing')->after('plant_type')->comment('Space between plants in a row (meters)');
            $table->float('row_spacing')->after('plant_spacing')->comment('Space between rows (meters)');
            $table->float('water_needed')->change()->comment('Water needed per plant (liters)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('farms', function (Blueprint $table) {
            // Revert changes
            $table->float('space');
            $table->dropColumn(['plant_type', 'plant_spacing', 'row_spacing']);
            $table->float('water_needed')->change();
        });
    }
};
