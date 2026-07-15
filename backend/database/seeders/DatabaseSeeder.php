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

        // Seed Categories
        \App\Models\Category::create(['name' => 'Ketua OSIS']);
        \App\Models\Category::create(['name' => 'Ketua MPK']);
        \App\Models\Category::create(['name' => 'Ketua Pramuka']);

        Voter::create([
            'identifier'  => '2223101',
            'name'     => 'Mamat Rudiyanto',
            'password' => Hash::make('siswak4'),
            'role'     => 'SISWA',
            'class'    => '10 PPLG 1',
        ]);

        Voter::create([
            'identifier'  => '2223102',
            'name'     => 'Asep Suhendar',
            'password' => Hash::make('2223102'),
            'role'     => 'SISWA',
            'class'    => '10 PPLG 2',
        ]);

        Voter::create([
            'identifier'  => '19890512',
            'name'     => 'Sri Wahyuni S.Pd',
            'password' => Hash::make('mitrak4'),
            'role'     => 'GURU_STAF',
            'class'    => 'GURU',
        ]);
    }
}