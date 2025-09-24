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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('plan_type'); // 'pro', 'advanced'
            $table->integer('months'); // Number of months purchased
            $table->decimal('amount', 10, 2); // Payment amount
            $table->string('currency', 3)->default('THB'); // Currency code
            $table->integer('tokens_purchased'); // Number of tokens to be added
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('payment_proof')->nullable(); // Payment proof/screenshot
            $table->text('notes')->nullable(); // Additional notes from user
            $table->text('admin_notes')->nullable(); // Admin notes
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
