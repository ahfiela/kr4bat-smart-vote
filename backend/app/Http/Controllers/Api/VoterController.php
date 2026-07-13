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
    public function verifyRoomCode(Request $request): JsonResponse
    {
        $request->validate([
            'room_code' => 'required|string',
        ]);

        $voter = $request->user();

        $session = VotingSession::where('room_code', $request->room_code)
            ->where('status', 'ACTIVE')
            ->first();

        if (!$session) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kode ruangan tidak valid atau sesi belum aktif',
            ], 404);
        }

        if ($session->allowed_classes && $voter->class && !in_array($voter->class, $session->allowed_classes)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kelas kamu tidak termasuk dalam sesi pemilihan ini',
            ], 403);
        }

        if ($voter->hasVotedIn($session->id)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kamu sudah memberikan suara pada sesi ini',
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
                'message' => 'Sesi pemilihan tidak aktif',
            ], 422);
        }

        if ($voter->hasVotedIn($sessionId)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kamu sudah memberikan suara pada sesi ini',
            ], 409);
        }

        try {
            DB::transaction(function () use ($validated, $voter, $sessionId) {
                $candidate = Candidate::where('id', $validated['candidate_id'])
                    ->where('voting_session_id', $sessionId)
                    ->lockForUpdate()
                    ->firstOrFail();

                $candidate->increment('votes_count');

                $voter->histories()->create([
                    'voting_session_id' => $sessionId,
                ]);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kamu sudah memberikan suara pada sesi ini',
            ], 409);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Suara berhasil direkam. Terima kasih!',
        ]);
    }
}