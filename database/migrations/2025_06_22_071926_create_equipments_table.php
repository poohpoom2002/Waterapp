<?php
// database/migrations/xxxx_create_equipments_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('equipments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('equipment_categories')->onDelete('cascade');
            $table->string('product_code', 100)->unique();
            $table->string('name');
            $table->string('brand', 100)->nullable();
            $table->string('image')->nullable();
            $table->decimal('price', 10, 2);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index(['category_id', 'is_active']);
            $table->index('product_code');
        });
    }

    public function down()
    {
        Schema::dropIfExists('equipments');
    }
};
