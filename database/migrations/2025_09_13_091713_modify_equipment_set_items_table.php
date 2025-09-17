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
        Schema::table('equipment_set_items', function (Blueprint $table) {
            // Drop old foreign key and column
            $table->dropForeign(['equipment_set_id']);
            $table->dropColumn('equipment_set_id');
            
            // Add new group_id column
            $table->unsignedBigInteger('group_id')->after('id');
            $table->foreign('group_id')->references('id')->on('equipment_set_groups')->onDelete('cascade');
            
            // Remove category_id as it's redundant (can get from equipment)
            $table->dropForeign(['category_id']);
            $table->dropColumn('category_id');
            
            // Update indexes
            $table->dropIndex(['equipment_set_id', 'sort_order']);
            $table->index(['group_id', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('equipment_set_items', function (Blueprint $table) {
            // Drop new structure
            $table->dropForeign(['group_id']);
            $table->dropColumn('group_id');
            
            // Restore old structure
            $table->unsignedBigInteger('equipment_set_id')->after('id');
            $table->unsignedBigInteger('category_id')->after('equipment_set_id');
            
            // Restore foreign keys
            $table->foreign('equipment_set_id')->references('id')->on('equipment_sets')->onDelete('cascade');
            $table->foreign('category_id')->references('id')->on('equipment_categories')->onDelete('cascade');
            
            // Restore indexes
            $table->dropIndex(['group_id', 'sort_order']);
            $table->index(['equipment_set_id', 'sort_order']);
        });
    }
};
