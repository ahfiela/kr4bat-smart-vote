<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Sanctum\HasApiTokens;

class Voter extends Authenticatable
{
    use HasApiTokens;

    protected $fillable = [
        'identifier',
        'name',
        'password',
        'role',
        'class',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'password' => 'hashed',
    ];

    public function histories(): HasMany
    {
        return $this->hasMany(VoterHistory::class);
    }

    public function hasVotedIn(int $votingSessionId): bool
    {
        return $this->histories()->where('voting_session_id', $votingSessionId)->exists();
    }
}