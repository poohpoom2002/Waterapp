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
            $table->string('project_mode')->nullable()->after('area_type');
            $table->string('active_zone_id')->nullable()->after('project_mode');
            $table->boolean('show_pump_option')->default(true)->after('active_zone_id');
            $table->json('quotation_data')->nullable()->after('show_pump_option');
            $table->json('quotation_data_customer')->nullable()->after('quotation_data');
            $table->json('garden_data')->nullable()->after('quotation_data_customer');
            $table->json('garden_stats')->nullable()->after('garden_data');
            $table->json('field_crop_data')->nullable()->after('garden_stats');
            $table->json('greenhouse_data')->nullable()->after('field_crop_data');
            $table->timestamp('last_saved')->nullable()->after('greenhouse_data');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fields', function (Blueprint $table) {
            $table->dropColumn([
                'project_mode',
                'active_zone_id',
                'show_pump_option',
                'quotation_data',
                'quotation_data_customer',
                'garden_data',
                'garden_stats',
                'field_crop_data',
                'greenhouse_data',
                'last_saved'
            ]);
        });
    }
};
