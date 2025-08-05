<?php
// สร้างไฟล์ migration ใหม่
// php artisan make:migration add_stock_to_equipments_table

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('equipments', function (Blueprint $table) {
            if (!Schema::hasColumn('equipments', 'stock')) {
                $table->integer('stock')->nullable()->after('price');
            }
        });
    }

    public function down()
    {
        Schema::table('equipments', function (Blueprint $table) {
            if (Schema::hasColumn('equipments', 'stock')) {
                $table->dropColumn('stock');
            }
        });
    }
};