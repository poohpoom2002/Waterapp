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
            $table->integer('tokens')->default(100)->after('is_super_user'); // Starting tokens for new users
            $table->integer('total_tokens_used')->default(0)->after('tokens'); // Track total usage
            $table->timestamp('last_token_refresh')->nullable()->after('total_tokens_used'); // Last time tokens were refreshed
            $table->integer('token_refresh_count')->default(0)->after('last_token_refresh'); // How many times tokens have been refreshed
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['tokens', 'total_tokens_used', 'last_token_refresh', 'token_refresh_count']);
        });
    }
};