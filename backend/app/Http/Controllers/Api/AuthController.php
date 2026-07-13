<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Voter;
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

    private function loginResponse(string $message, array $data): JsonResponse
    {
        return response()->json([
            'status'  => 'success',
            'message' => $message,
            'data'    => $data,
        ], 200);
    }
}