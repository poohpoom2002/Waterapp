<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EquipmentSet extends Model
{
    protected $fillable = [
        'name',
        'description',
        'total_price',
        'user_id',
        'is_active'
    ];

    protected $casts = [
        'total_price' => 'decimal:2',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the groups for the equipment set.
     */
    public function groups(): HasMany
    {
        return $this->hasMany(EquipmentSetGroup::class)->orderBy('sort_order');
    }

    /**
     * Get the user that owns the equipment set.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Calculate and update total price
     */
    public function updateTotalPrice(): void
    {
        $totalPrice = 0;
        foreach ($this->groups as $group) {
            $totalPrice += $group->getTotalPrice();
        }
        $this->update(['total_price' => $totalPrice]);
    }

    /**
     * Scope to get active equipment sets
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get equipment sets by user
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Get equipment set with all relationships loaded
     */
    public function toDetailedFormat()
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'total_price' => $this->total_price,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'groups' => $this->groups->map(function ($group) {
                return $group->toDetailedFormat();
            })->toArray()
        ];
    }
}
