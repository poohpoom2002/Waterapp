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
        Schema::create('chatbot_knowledge_base', function (Blueprint $table) {
            $table->id();
            $table->string('source_name', 255)->comment('ชื่อไฟล์ PDF ต้นทาง');
            $table->text('content')->comment('เนื้อหาข้อความที่ตัดเป็นชิ้น (Chunk)');
            $table->timestamps();

            // สร้าง Full-Text Index บนคอลัมน์ content สำหรับการค้นหาด้วย MySQL
            // นี่คือหัวใจสำคัญของการค้นหาบน MySQL
            $table->fullText('content');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chatbot_knowledge_base');
    }
};
