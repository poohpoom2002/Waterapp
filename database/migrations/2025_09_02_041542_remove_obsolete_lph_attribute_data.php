<?php

use App\Models\EquipmentAttribute;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // คำสั่ง: ให้ค้นหา Attribute ที่มี unit เป็น 'ลิตร/ชั่วโมง' แล้วลบทิ้ง
        EquipmentAttribute::where('unit', 'ลิตร/ชั่วโมง')->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // ไม่ต้องทำอะไรเมื่อต้องการย้อนกลับ
    }
};