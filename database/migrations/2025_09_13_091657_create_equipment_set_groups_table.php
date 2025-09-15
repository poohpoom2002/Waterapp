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
        Schema::create('equipment_set_groups', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('equipment_set_id');
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            // Foreign key constraints
            $table->foreign('equipment_set_id')->references('id')->on('equipment_sets')->onDelete('cascade');
            
            // Indexes
            $table->index(['equipment_set_id', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipment_set_groups');
    }
};
