<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VoterHistory extends Model
{
    protected $fillable = [
        'voter_id',
        'voting_session_id',
        'candidate_id',
    ];

    public function voter(): BelongsTo
    {
        return $this->belongsTo(Voter::class);
    }

    public function votingSession(): BelongsTo
    {
        return $this->belongsTo(VotingSession::class);
    }

    public function candidate(): BelongsTo
    {
        return $this->belongsTo(Candidate::class);
    }
}