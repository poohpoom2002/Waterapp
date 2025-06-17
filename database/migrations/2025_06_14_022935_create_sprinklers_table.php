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
        Schema::create('sprinklers', function (Blueprint $table) {
            $table->id();
        
            $table->string('code')->unique();            // รหัสสินค้า
            $table->string('name');                      // ชื่อสินค้า
            $table->string('origin')->nullable();        // ต้นกำเนิด
            $table->string('brand')->nullable();         // แบรนด์
            $table->string('size')->nullable();          // ขนาด
            $table->text('special_features')->nullable();// คุณลักษณะพิเศษ
            $table->text('spec')->nullable();            // เสป็คสินค้า
            $table->text('review')->nullable();          // รีวิวการใช้งาน
            $table->text('usage')->nullable();           // วิธีการใช้งาน
            $table->text('maintenance')->nullable();     // วิธีบำรุงรักษา
            $table->text('note')->nullable();            // คำแนะนำเพิ่มเติม
        
            $table->timestamps();
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sprinklers');
    }
};
