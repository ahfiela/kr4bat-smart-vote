<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VotingSession extends Model
{
    public const STATUS_DRAFT    = 'DRAFT';
    public const STATUS_ACTIVE   = 'ACTIVE';
    public const STATUS_ARCHIVED = 'ARCHIVED';

    protected $fillable = [
        'category_id',
        'name',
        'description',
        'year',
        'room_code',
        'status',
        'allowed_roles',
        'allowed_classes',
        'completed_kloters',
        'active_kloter',
        'allowed_voters',
        'results_published',
    ];

    protected $casts = [
        'allowed_roles'     => 'array',
        'allowed_classes'   => 'array',
        'completed_kloters' => 'array',
        'allowed_voters'    => 'array',
        'year'              => 'integer',
        'results_published' => 'boolean',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function candidates(): HasMany
    {
        return $this->hasMany(Candidate::class);
    }

    public function histories(): HasMany
    {
        return $this->hasMany(VoterHistory::class);
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }
}