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
        Schema::table('users', function (Blueprint $table) {
            $table->enum('tier', ['free', 'pro', 'advanced'])->default('free')->after('is_super_user');
            $table->dateTime('tier_expires_at')->nullable()->after('tier');
            $table->integer('monthly_tokens')->default(100)->after('tier_expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['tier', 'tier_expires_at', 'monthly_tokens']);
        });
    }
};
