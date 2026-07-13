<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('voting_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->year('year');
            $table->string('room_code')->unique();
            $table->enum('status', ['DRAFT', 'ACTIVE', 'ARCHIVED'])->default('DRAFT');
            $table->json('allowed_classes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voting_sessions');
    }
};