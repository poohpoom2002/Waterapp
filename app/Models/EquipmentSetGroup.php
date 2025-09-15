<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EquipmentSetGroup extends Model
{
    protected $fillable = [
        'equipment_set_id',
        'sort_order'
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the equipment set that owns this group.
     */
    public function equipmentSet(): BelongsTo
    {
        return $this->belongsTo(EquipmentSet::class);
    }

    /**
     * Get the items in this group.
     */
    public function items(): HasMany
    {
        return $this->hasMany(EquipmentSetItem::class, 'group_id')->orderBy('sort_order');
    }

    /**
     * Calculate total price of items in this group
     */
    public function getTotalPrice(): float
    {
        return $this->items()->sum('total_price');
    }

    /**
     * Get count of items in this group
     */
    public function getItemsCount(): int
    {
        return $this->items()->count();
    }

    /**
     * Scope to order by sort_order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order');
    }

    /**
     * Get group with all relationships loaded
     */
    public function toDetailedFormat()
    {
        return [
            'id' => $this->id,
            'equipment_set_id' => $this->equipment_set_id,
            'sort_order' => $this->sort_order,
            'total_price' => $this->getTotalPrice(),
            'items_count' => $this->getItemsCount(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'items' => $this->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'equipment_id' => $item->equipment_id,
                    'category_id' => $item->equipment ? $item->equipment->category_id : 0,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'total_price' => $item->total_price,
                    'sort_order' => $item->sort_order,
                    'equipment' => $item->equipment,
                ];
            })->toArray()
        ];
    }
}
