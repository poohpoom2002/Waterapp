<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('equipment_set_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('equipment_set_id');
            $table->unsignedBigInteger('category_id');
            $table->unsignedBigInteger('equipment_id');
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 10, 2)->default(0);
            $table->decimal('total_price', 10, 2)->default(0);
            $table->text('notes')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            // Foreign key constraints
            $table->foreign('equipment_set_id')->references('id')->on('equipment_sets')->onDelete('cascade');
            $table->foreign('category_id')->references('id')->on('equipment_categories')->onDelete('cascade');
            $table->foreign('equipment_id')->references('id')->on('equipments')->onDelete('cascade');
            
            // Indexes
            $table->index(['equipment_set_id', 'sort_order']);
            $table->index('category_id');
            $table->index('equipment_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipment_set_items');
    }
};
