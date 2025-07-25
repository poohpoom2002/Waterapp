<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('folders', function (Blueprint $table) {
            // First, we need to temporarily change the column to allow the enum modification
            $table->string('type')->change();
        });

        // Now we can modify the enum to include custom types
        DB::statement("ALTER TABLE folders MODIFY COLUMN type ENUM('finished', 'unfinished', 'custom', 'customer', 'category') NOT NULL DEFAULT 'custom'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('folders', function (Blueprint $table) {
            // Revert back to original enum
            DB::statement("ALTER TABLE folders MODIFY COLUMN type ENUM('finished', 'unfinished') NOT NULL DEFAULT 'finished'");
        });
    }
};
