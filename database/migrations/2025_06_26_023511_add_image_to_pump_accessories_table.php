<?php
// database/migrations/xxxx_add_image_to_pump_accessories_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('pump_accessories', function (Blueprint $table) {
            if (! Schema::hasColumn('pump_accessories', 'image')) {
                $table->string('image')->nullable()->after('name');
            }
        });
        
    }

    public function down()
    {
        Schema::table('pump_accessories', function (Blueprint $table) {
            $table->dropColumn('image');
        });
    }
};