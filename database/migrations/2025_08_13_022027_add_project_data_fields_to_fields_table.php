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
        Schema::table('fields', function (Blueprint $table) {
            $table->json('project_data')->nullable()->after('area_type');
            $table->json('project_stats')->nullable()->after('project_data');
            $table->json('zone_inputs')->nullable()->after('project_stats');
            $table->json('selected_pipes')->nullable()->after('zone_inputs');
            $table->json('selected_pump')->nullable()->after('selected_pipes');
            $table->json('zone_sprinklers')->nullable()->after('selected_pump');
            $table->string('zone_operation_mode')->nullable()->after('zone_sprinklers');
            $table->json('zone_operation_groups')->nullable()->after('zone_operation_mode');
            $table->json('effective_equipment')->nullable()->after('zone_operation_groups');
            $table->json('zone_calculation_data')->nullable()->after('effective_equipment');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fields', function (Blueprint $table) {
            $table->dropColumn([
                'project_data',
                'project_stats',
                'zone_inputs',
                'selected_pipes',
                'selected_pump',
                'zone_sprinklers',
                'zone_operation_mode',
                'zone_operation_groups',
                'effective_equipment',
                'zone_calculation_data'
            ]);
        });
    }
};
