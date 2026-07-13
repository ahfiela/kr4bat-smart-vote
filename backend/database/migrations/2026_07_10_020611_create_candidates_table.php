<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voting_session_id')->constrained('voting_sessions')->onDelete('cascade');
            $table->string('candidate_number'); 
            $table->string('name');
            $table->string('photo_path')->nullable();
            $table->text('vision');
            $table->text('mission');
            $table->unsignedInteger('votes_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidates');
    }
};