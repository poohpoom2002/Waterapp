<?php
// database/migrations/xxxx_add_description_to_pump_accessories_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('pump_accessories', function (Blueprint $table) {
            if (!Schema::hasColumn('pump_accessories', 'description')) {
                $table->text('description')->nullable()->after('size');
            }
        });
    }

    public function down()
    {
        Schema::table('pump_accessories', function (Blueprint $table) {
            $table->dropColumn('description');
        });
    }
};