<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('sprinkler_product_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sprinkler_product_id')
                  ->constrained('sprinkler_product')
                  ->onDelete('cascade');

            $table->string('url');             // URL ของภาพ
            $table->integer('position')->default(1); // ลำดับภาพ (1-4)
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('sprinkler_product_images');
    }
};
