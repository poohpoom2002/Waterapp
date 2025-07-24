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
        Schema::table('fields', function (Blueprint $table) {
            $table->string('status')->default('unfinished')->after('category');
            $table->boolean('is_completed')->default(false)->after('status');
            $table->index(['status', 'is_completed']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fields', function (Blueprint $table) {
            $table->dropIndex(['status', 'is_completed']);
            $table->dropColumn(['status', 'is_completed']);
        });
    }
};
