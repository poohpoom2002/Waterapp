<?php
// database/migrations/xxxx_create_pump_accessories_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('pump_accessories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pump_id')->constrained('equipments')->onDelete('cascade');
            $table->enum('accessory_type', ['foot_valve', 'check_valve', 'ball_valve', 'pressure_gauge', 'float_switch', 'other']);
            $table->string('name');
            $table->string('image')->nullable(); 
            $table->string('size', 50)->nullable();
            $table->json('specifications')->nullable();
            $table->decimal('price', 10, 2)->default(0);
            $table->boolean('is_included')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            
            $table->index(['pump_id', 'accessory_type']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('pump_accessories');
    }
};