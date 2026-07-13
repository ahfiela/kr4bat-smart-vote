<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;    
use App\Models\Voter;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::create([
            'name'     => 'Super Admin K4',
            'username' => 'admink4',
            'email'    => 'admink4@smkn4bogor.sch.id',
            'password' => Hash::make('AdminKr4bat!'),
        ]);

        Voter::create([
            'user_id'  => '2223101',
            'name'     => 'Mamat Rudiyanto',
            'password' => Hash::make('siswak4'),
            'role'     => 'SISWA',
        ]);

        Voter::create([
            'user_id'  => '19890512',
            'name'     => 'Sri Wahyuni S.Pd',
            'password' => Hash::make('mitrak4'),
            'role'     => 'GURU_STAF',
        ]);
    }
}