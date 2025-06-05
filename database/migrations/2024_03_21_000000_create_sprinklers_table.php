<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('sprinklers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('water_flow', 8, 2); // L/min
            $table->decimal('min_radius', 8, 2); // meters
            $table->decimal('max_radius', 8, 2); // meters
            $table->text('description');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('sprinklers');
    }
}; 