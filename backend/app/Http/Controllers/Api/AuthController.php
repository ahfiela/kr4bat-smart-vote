<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Voter;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'user_id'  => 'required|string|max:50',
            'password' => 'required|string|min:6',
        ]);

        $usernameOrId = $request->user_id;
        $password = $request->password;

        // Coba sebagai admin
        $admin = User::where('username', $usernameOrId)->first();
        if ($admin && Hash::check($password, $admin->password)) {
            $token = $admin->createToken('AdminToken', ['role:admin'])->plainTextToken;

            return $this->loginResponse('Login Admin Berhasil', [
                'role'  => 'ADMIN',
                'token' => $token,
                'user'  => [
                    'name'     => $admin->name,
                    'username' => $admin->username,
                ],
            ]);
        }

        // Coba sebagai voter
        $voter = Voter::where('identifier', $usernameOrId)->first();
        if ($voter && Hash::check($password, $voter->password)) {
            $token = $voter->createToken('VoterToken', ['role:voter'])->plainTextToken;

            return $this->loginResponse('Login Pemilih Berhasil', [
                'role'  => $voter->role, // SISWA / GURU_STAF / MITRA
                'token' => $token,
                'user'  => [
                    'name'       => $voter->name,
                    'identifier' => $voter->identifier,
                    'class'      => $voter->class,
                ],
            ]);
        }

        return response()->json([
            'status'  => 'error',
            'message' => 'Kredensial login salah atau tidak terdaftar!',
        ], 401);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user instanceof User;

        return response()->json([
            'status' => 'success',
            'data'   => [
                'role' => $isAdmin ? 'ADMIN' : $user->role,
                'user' => $isAdmin
                    ? ['name' => $user->name, 'username' => $user->username]
                    : ['name' => $user->name, 'identifier' => $user->identifier, 'class' => $user->class],
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Berhasil logout',
        ]);
    }

    public function quickLoginVoters(Request $request): JsonResponse
    {
        $role = strtoupper($request->query('role', ''));

        if (!in_array($role, ['SISWA', 'GURU_STAF', 'MITRA'])) {
            return response()->json(['status' => 'error', 'message' => 'Role tidak valid.'], 422);
        }

        // Filter opsional dari settings: jika key "display_voter_masuk_cepat"
        // ada & bernilai, tampilkan hanya siswa kelas tsb (bisa multi kelas,
        // dipisah koma, misal: "XII PPLG 2, XII TJKT 2"). Kosong = semua.
        $filterClasses = null;
        if ($role === 'SISWA') {
            $raw = Setting::where('key', 'display_voter_masuk_cepat')->value('value');
            if ($raw !== null) {
                $classes = collect(explode(',', $raw))
                    ->map(fn ($c) => trim($c))
                    ->filter(fn ($c) => $c !== '')
                    ->unique()
                    ->values()
                    ->all();

                if (!empty($classes)) {
                    $filterClasses = $classes;
                }
            }
        }

        $query = Voter::where('role', $role)->orderBy('name');
        if ($filterClasses) {
            $query->whereIn('class', $filterClasses);
        }

        $voters = $query
            ->get(['identifier', 'name', 'class'])
            ->map(fn ($v) => ['id' => $v->identifier, 'name' => $v->name, 'class' => $v->class])
            ->values();

        return response()->json([
            'status'       => 'success',
            'data'         => $voters,
            'filter_class' => $filterClasses,
        ]);
    }

    private function loginResponse(string $message, array $data): JsonResponse
    {
        return response()->json([
            'status'  => 'success',
            'message' => $message,
            'data'    => $data,
        ], 200);
    }
}