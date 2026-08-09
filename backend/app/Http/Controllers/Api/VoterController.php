<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use App\Models\VotingSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VoterController extends Controller
{
    public function getAvailableSessions(Request $request): JsonResponse
    {
        $voter = $request->user();

        $sessions = VotingSession::where('status', 'ACTIVE')
            ->with('category')
            ->get()
            ->filter(function ($session) use ($voter) {
                // Jika voter ada di allowed_voters (pencarian manual level 2), beri akses
                $isExplicitlyAllowed = !empty($session->allowed_voters) && in_array($voter->identifier, $session->allowed_voters);

                if (!$isExplicitlyAllowed) {
                    // Periksa batasan peran global (Level 1)
                    if (!empty($session->allowed_roles) && !in_array($voter->role, $session->allowed_roles)) {
                        return false;
                    }

                    // Periksa Kloter Aktif (Requirement 3)
                    if (!empty($session->active_kloter)) {
                        $activeKloter = $session->active_kloter;
                        if ($activeKloter === 'GURU_STAF') {
                            if ($voter->role !== 'GURU_STAF') return false;
                        } elseif ($activeKloter === 'MITRA') {
                            if ($voter->role !== 'MITRA') return false;
                        } else {
                            if ($voter->class !== $activeKloter) return false;
                        }
                    }

                    // Periksa batasan kelas jika ada
                    if (!empty($session->allowed_classes)) {
                        if (empty($voter->class) || !in_array($voter->class, $session->allowed_classes)) {
                            return false;
                        }
                    }
                }
                // Periksa apakah sudah memilih
                return !$voter->hasVotedIn($session->id);
            })
            ->values();

        return response()->json([
            'status' => 'success',
            'data'   => $sessions,
        ]);
    }

    public function verifyRoomCode(Request $request): JsonResponse
    {
        $request->validate([
            'room_code' => 'required|string',
            'session_id' => 'required|exists:voting_sessions,id',
        ]);

        $voter = $request->user();

        $session = VotingSession::where('id', $request->session_id)
            ->where('room_code', $request->room_code)
            ->where('status', 'ACTIVE')
            ->first();

        if (!$session) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kode ruangan salah atau bilik suara belum diaktifkan!',
            ], 404);
        }

        $isExplicitlyAllowed = !empty($session->allowed_voters) && in_array($voter->identifier, $session->allowed_voters);

        if (!$isExplicitlyAllowed) {
            if (!empty($session->allowed_roles) && !in_array($voter->role, $session->allowed_roles)) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Peran pengguna kamu tidak memiliki hak akses pada bilik ini.',
                ], 403);
            }

            // Periksa Kloter Aktif (Requirement 3)
            if (!empty($session->active_kloter)) {
                $activeKloter = $session->active_kloter;
                $isKloterMatch = false;

                if ($activeKloter === 'GURU_STAF' && $voter->role === 'GURU_STAF') {
                    $isKloterMatch = true;
                } elseif ($activeKloter === 'MITRA' && $voter->role === 'MITRA') {
                    $isKloterMatch = true;
                } elseif ($voter->class === $activeKloter) {
                    $isKloterMatch = true;
                }

                if (!$isKloterMatch) {
                    return response()->json([
                        'status'  => 'error',
                        'message' => "Akses ditolak. Saat ini bilik suara sedang diprioritaskan khusus untuk kloter: '{$activeKloter}'. Silahkan tunggu giliran kloter Anda!",
                    ], 403);
                }
            }

            if (!empty($session->allowed_classes) && (empty($voter->class) || !in_array($voter->class, $session->allowed_classes))) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Kelas/Kategori kamu tidak terdaftar untuk mengikuti sesi pemilihan ini.',
                ], 403);
            }
        }

        if ($voter->hasVotedIn($session->id)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kamu sudah memberikan suara pada sesi pemilihan ini.',
            ], 409);
        }

        return response()->json([
            'status' => 'success',
            'data'   => [
                'session'    => $session->only(['id', 'name', 'year', 'room_code']),
                'candidates' => $session->candidates()
                    ->select(['id', 'voting_session_id', 'candidate_number', 'name', 'photo_path', 'vision', 'mission'])
                    ->orderBy('candidate_number')
                    ->get(),
            ],
        ]);
    }

    public function submitVote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'voting_session_id' => 'required|exists:voting_sessions,id',
            'candidate_id'      => 'required|exists:candidates,id',
        ]);

        $voter = $request->user();
        $sessionId = $validated['voting_session_id'];

        $session = VotingSession::find($sessionId);
        if (!$session || $session->status !== 'ACTIVE') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Sesi pemilihan tidak aktif.',
            ], 422);
        }

        if ($voter->hasVotedIn($sessionId)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kamu sudah memberikan suara pada sesi ini.',
            ], 409);
        }

        try {
            DB::transaction(function () use ($validated, $voter, $sessionId) {
                $candidate = Candidate::where('id', $validated['candidate_id'])
                    ->where('voting_session_id', $sessionId)
                    ->lockForUpdate()
                    ->firstOrFail();

                $candidate->increment('votes_count');

                // Simpan pilihan voter (candidate_id) untuk riwayat pribadinya
                $voter->histories()->create([
                    'voting_session_id' => $sessionId,
                    'candidate_id'      => $validated['candidate_id'],
                ]);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal merekam pilihan. Silahkan coba lagi.',
            ], 409);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Suara kamu berhasil direkam. Terima kasih atas partisipasinya!',
        ]);
    }

    public function getResults(Request $request): JsonResponse
    {
        // Ambil sesi ARCHIVED yang dipublikasikan hasilnya
        $sessions = VotingSession::where('status', 'ARCHIVED')
            ->where('results_published', true)
            ->with(['category', 'candidates' => function ($q) {
                $q->orderBy('candidate_number');
            }])
            ->latest()
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $sessions,
        ]);
    }

    public function getHistory(Request $request): JsonResponse
    {
        $voter = $request->user();

        // Ambil riwayat pemilih
        $history = $voter->histories()
            ->with(['votingSession.category', 'candidate'])
            ->latest()
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $history,
        ]);
    }
}