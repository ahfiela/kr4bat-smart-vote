<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('voters', function (Blueprint $table) {
            $table->id();
            $table->string('identifier')->unique(); // NISN/NIP/kode unik pemilih
            $table->string('name');
            $table->string('password');
            $table->enum('role', ['SISWA', 'GURU_STAF', 'MITRA']);
            $table->string('class')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voters');
    }
};