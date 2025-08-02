<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('equipments', function (Blueprint $table) {
            $table->integer('stock')->nullable()->after('price');
            $table->dropUnique(['product_code']);
        });
        
        Schema::table('equipments', function (Blueprint $table) {
            $table->unique('product_code', 'equipments_product_code_unique_not_null');
        });
    }

    public function down()
    {
        Schema::table('equipments', function (Blueprint $table) {
            $table->dropColumn('stock');
            $table->dropIndex('equipments_product_code_unique_not_null');
        });
        
        Schema::table('equipments', function (Blueprint $table) {
            $table->unique('product_code');
        });
    }
};