<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('pump_accessories', function (Blueprint $table) {
            $table->dropColumn(['accessory_type', 'specifications']);
            $table->string('product_code', 100)->nullable()->after('pump_id');
            $table->integer('stock')->nullable()->after('price');
            $table->integer('quantity')->default(1)->after('stock');
        });
    }

    public function down()
    {
        Schema::table('pump_accessories', function (Blueprint $table) {
            $table->enum('accessory_type', ['foot_valve', 'check_valve', 'ball_valve', 'pressure_gauge', 'float_switch', 'other'])->after('pump_id');
            $table->json('specifications')->nullable()->after('size');
            $table->dropColumn(['product_code', 'stock', 'quantity']);
        });
    }
};