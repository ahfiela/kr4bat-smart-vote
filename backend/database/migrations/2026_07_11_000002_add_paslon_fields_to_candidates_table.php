<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidates', function (Blueprint $table) {
            $table->string('wakil_name')->nullable()->after('name');
            $table->string('ketua_photo_path')->nullable()->after('photo_path');
            $table->string('wakil_photo_path')->nullable()->after('ketua_photo_path');
            $table->text('wakil_experience')->nullable()->after('experience');
        });
    }

    public function down(): void
    {
        Schema::table('candidates', function (Blueprint $table) {
            $table->dropColumn(['wakil_name', 'ketua_photo_path', 'wakil_photo_path', 'wakil_experience']);
        });
    }
};
