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
        'photo_path',
        'vision',
        'mission',
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