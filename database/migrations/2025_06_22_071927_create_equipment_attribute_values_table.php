<?php
// database/migrations/xxxx_create_equipment_attribute_values_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('equipment_attribute_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_id')->constrained('equipments')->onDelete('cascade');
            $table->foreignId('attribute_id')->constrained('equipment_attributes')->onDelete('cascade');
            $table->json('value');
            $table->timestamps();
            
            $table->unique(['equipment_id', 'attribute_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('equipment_attribute_values');
    }
};