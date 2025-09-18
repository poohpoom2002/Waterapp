<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EquipmentSetItem extends Model
{
    protected $fillable = [
        'group_id',
        'equipment_id',
        'quantity',
        'unit_price',
        'total_price',
        'notes',
        'sort_order'
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'sort_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the group that owns the item.
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(EquipmentSetGroup::class);
    }

    /**
     * Get the equipment for the item.
     */
    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    /**
     * Calculate and update total price based on quantity and unit price
     */
    public function updateTotalPrice(): void
    {
        $this->total_price = $this->quantity * $this->unit_price;
        $this->save();
    }

    /**
     * Boot the model to automatically calculate total price
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            $model->total_price = $model->quantity * $model->unit_price;
        });

        static::saved(function ($model) {
            // Update the parent equipment set's total price
            $model->group->equipmentSet->updateTotalPrice();
        });

        static::deleted(function ($model) {
            // Update the parent equipment set's total price
            $model->group->equipmentSet->updateTotalPrice();
        });
    }

    /**
     * Scope to order by sort_order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order');
    }
}
