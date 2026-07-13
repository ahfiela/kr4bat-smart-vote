<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VotingSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function index(): JsonResponse
    {
        $sessions = VotingSession::withCount('candidates')
            ->latest()
            ->get();

        return response()->json(['status' => 'success', 'data' => $sessions]);
    }

    public function show(VotingSession $session): JsonResponse
    {
        $session->load('candidates');

        return response()->json(['status' => 'success', 'data' => $session]);
    }

    public function storeSession(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:150',
            'year'             => 'required|digits:4',
            'room_code'        => 'required|string|max:20|unique:voting_sessions,room_code',
            'allowed_classes'  => 'nullable|array',
            'allowed_classes.*' => 'string',
        ]);

        $session = VotingSession::create([
            ...$validated,
            'status' => 'DRAFT',
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Sesi pemilihan berhasil dibuat',
            'data'    => $session,
        ], 201);
    }

    public function updateStatus(Request $request, VotingSession $session): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['DRAFT', 'ACTIVE', 'ARCHIVED'])],
        ]);

        $session->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => "Status sesi diubah menjadi {$validated['status']}",
            'data'    => $session,
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $admin = $request->user();

        $validated = $request->validate([
            'name'     => 'sometimes|string|max:150',
            'username' => ['sometimes', 'string', 'max:100', Rule::unique('users', 'username')->ignore($admin->id)],
            'password' => 'sometimes|nullable|string|min:6|confirmed',
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $admin->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Profil berhasil diperbarui',
            'data'    => $admin->only(['name', 'username']),
        ]);
    }
}