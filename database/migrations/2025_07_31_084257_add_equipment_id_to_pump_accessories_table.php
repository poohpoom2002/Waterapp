<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('pump_accessories', function (Blueprint $table) {
            $table->foreignId('equipment_id')->nullable()->after('pump_id')->constrained('equipments')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::table('pump_accessories', function (Blueprint $table) {
            $table->dropForeign(['equipment_id']);
            $table->dropColumn('equipment_id');
        });
    }
};