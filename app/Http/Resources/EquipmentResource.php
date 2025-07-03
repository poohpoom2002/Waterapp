<?php
// app/Http/Resources/EquipmentResource.php
namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class EquipmentResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id'               => $this->id,
            'product_code'     => $this->product_code,
            'name'             => $this->name,
            'brand'            => $this->brand,
            'category'         => [
                'id'           => $this->category?->id,
                'name'         => $this->category?->name,
                'display_name' => $this->category?->display_name,
            ],
            'attributes'       => $this->whenLoaded('attributeValues', fn() =>
                $this->attributeValues->map(fn($av) => [
                    'name'  => $av->attribute->attribute_name,
                    'value' => $av->decoded_value ?? $av->value,
                ])
            ),
            'pump_accessories' => $this->whenLoaded('pumpAccessories', fn() =>
                $this->pumpAccessories->map(fn($pa) => [
                    'id'             => $pa->id,
                    'type'           => $pa->accessory_type,
                    'name'           => $pa->name,
                    'size'           => $pa->size,
                    'specifications' => $pa->specifications,
                    'price'          => $pa->price,
                    'is_included'    => (bool)$pa->is_included,
                    'sort_order'     => $pa->sort_order,
                ])
            ),
            'price'            => $this->price,
            'is_active'        => (bool)$this->is_active,
            'created_at'       => $this->created_at->toDateTimeString(),
            'updated_at'       => $this->updated_at->toDateTimeString(),
        ];
    }
}