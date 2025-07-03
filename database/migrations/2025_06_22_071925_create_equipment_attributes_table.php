<?php
// database/migrations/xxxx_create_equipment_attributes_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('equipment_attributes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('equipment_categories')->onDelete('cascade');
            $table->string('attribute_name', 50);
            $table->string('display_name', 100);
            $table->enum('data_type', ['string', 'number', 'array', 'boolean', 'json']);
            $table->string('unit', 20)->nullable();
            $table->boolean('is_required')->default(false);
            $table->json('validation_rules')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            
            $table->unique(['category_id', 'attribute_name']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('equipment_attributes');
    }
};