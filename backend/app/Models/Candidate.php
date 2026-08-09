<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Candidate extends Model
{
    protected $fillable = [
        'voting_session_id',
        'candidate_number',
        'name',
        'wakil_name',
        'photo_path',
        'ketua_photo_path',
        'wakil_photo_path',
        'vision',
        'mission',
        'experience',
        'wakil_experience',
        'votes_count',
    ];

    protected $casts = [
        'votes_count' => 'integer',
    ];

    public function votingSession(): BelongsTo
    {
        return $this->belongsTo(VotingSession::class);
    }

    public function incrementVote(): void
    {
        $this->increment('votes_count');
    }
}