<?php
// database/seeders/EquipmentSeeder.php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\EquipmentCategory;
use App\Models\EquipmentAttribute;
use App\Models\Equipment;
use App\Models\EquipmentAttributeValue;
use App\Models\PumpAccessory;

class EquipmentSeeder extends Seeder
{
    public function run()
    {
        // 1. สร้าง Categories
        $sprinklerCategory = EquipmentCategory::firstOrCreate(
            ['name' => 'sprinkler'],
            [
                'display_name' => 'สปริงเกอร์',
                'description' => 'หัวสปริงเกอร์สำหรับรดน้ำ',
                'icon' => '💧'
            ]
        );

        $pumpCategory = EquipmentCategory::firstOrCreate(
            ['name' => 'pump'],
            [
                'display_name' => 'ปั๊มน้ำ',
                'description' => 'ปั๊มน้ำสำหรับระบบชลประทาน',
                'icon' => '🔧'
            ]
        );

        $pipeCategory = EquipmentCategory::firstOrCreate(
            ['name' => 'pipe'],
            [
                'display_name' => 'ท่อ',
                'description' => 'ท่อสำหรับส่งน้ำ',
                'icon' => '🚰'
            ]
        );

        // 2. สร้าง Attributes สำหรับ Sprinkler (เพิ่มที่ขาดหายไป)
        $sprinklerAttrs = [
            [
                'attribute_name' => 'name',
                'display_name' => 'ชื่อสินค้า',
                'data_type' => 'string',
                'unit' => '',
                'is_required' => true,
                'sort_order' => 0
            ],
            [
                'attribute_name' => 'size_mm',
                'display_name' => 'ขนาด',
                'data_type' => 'number',
                'unit' => 'มม.',
                'is_required' => false,
                'sort_order' => 1
            ],
            [
                'attribute_name' => 'size_inch',
                'display_name' => 'ขนาด',
                'data_type' => 'number',
                'unit' => 'นิ้ว',
                'is_required' => false,
                'sort_order' => 2
            ],
            [
                'attribute_name' => 'waterVolumeLitersPerHour',
                'display_name' => 'อัตราการไหล',
                'data_type' => 'array',
                'unit' => 'ลิตร/ชั่วโมง',
                'is_required' => false,
                'sort_order' => 3
            ],
            [
                'attribute_name' => 'radiusMeters',
                'display_name' => 'รัศมีการกระจาย',
                'data_type' => 'array',
                'unit' => 'เมตร',
                'is_required' => false,
                'sort_order' => 4
            ],
            [
                'attribute_name' => 'pressureBar',
                'display_name' => 'แรงดัน',
                'data_type' => 'array',
                'unit' => 'บาร์',
                'is_required' => false,
                'sort_order' => 5
            ]
        ];

        foreach ($sprinklerAttrs as $attr) {
            EquipmentAttribute::firstOrCreate(
                [
                    'category_id' => $sprinklerCategory->id,
                    'attribute_name' => $attr['attribute_name']
                ],
                array_merge($attr, ['category_id' => $sprinklerCategory->id])
            );
        }

        // 3. สร้าง Attributes สำหรับ Pump (ครบถ้วน)
        $pumpAttrs = [
            [
                'attribute_name' => 'powerHP',
                'display_name' => 'กำลัง',
                'data_type' => 'number',
                'unit' => 'HP',
                'is_required' => false,
                'sort_order' => 0
            ],
            [
                'attribute_name' => 'powerKW',
                'display_name' => 'กำลัง',
                'data_type' => 'number',
                'unit' => 'kW',
                'is_required' => false,
                'sort_order' => 1
            ],
            [
                'attribute_name' => 'phase',
                'display_name' => 'ระบบไฟฟ้า',
                'data_type' => 'number',
                'unit' => 'เฟส',
                'is_required' => false,
                'sort_order' => 2
            ],
            [
                'attribute_name' => 'inlet_size_inch',
                'display_name' => 'ขนาดท่อเข้า',
                'data_type' => 'number',
                'unit' => 'นิ้ว',
                'is_required' => false,
                'sort_order' => 3
            ],
            [
                'attribute_name' => 'outlet_size_inch',
                'display_name' => 'ขนาดท่อออก',
                'data_type' => 'number',
                'unit' => 'นิ้ว',
                'is_required' => false,
                'sort_order' => 4
            ],
            [
                'attribute_name' => 'flow_rate_lpm',
                'display_name' => 'อัตราการไหล',
                'data_type' => 'array',
                'unit' => 'LPM',
                'is_required' => false,
                'sort_order' => 5
            ],
            [
                'attribute_name' => 'head_m',
                'display_name' => 'ความสูงยก',
                'data_type' => 'array',
                'unit' => 'เมตร',
                'is_required' => false,
                'sort_order' => 6
            ],
            [
                'attribute_name' => 'max_head_m',
                'display_name' => 'ความสูงยกสูงสุด',
                'data_type' => 'number',
                'unit' => 'เมตร',
                'is_required' => false,
                'sort_order' => 7
            ],
            [
                'attribute_name' => 'max_flow_rate_lpm',
                'display_name' => 'อัตราการไหลสูงสุด',
                'data_type' => 'number',
                'unit' => 'LPM',
                'is_required' => false,
                'sort_order' => 8
            ],
            [
                'attribute_name' => 'suction_depth_m',
                'display_name' => 'ความลึกดูด',
                'data_type' => 'number',
                'unit' => 'เมตร',
                'is_required' => false,
                'sort_order' => 9
            ],
            [
                'attribute_name' => 'dimensions_cm',
                'display_name' => 'ขนาด',
                'data_type' => 'string',
                'unit' => 'ซม.',
                'is_required' => false,
                'sort_order' => 10
            ],
            [
                'attribute_name' => 'weight_kg',
                'display_name' => 'น้ำหนัก',
                'data_type' => 'number',
                'unit' => 'กก.',
                'is_required' => false,
                'sort_order' => 11
            ]
        ];

        foreach ($pumpAttrs as $attr) {
            EquipmentAttribute::firstOrCreate(
                [
                    'category_id' => $pumpCategory->id,
                    'attribute_name' => $attr['attribute_name']
                ],
                array_merge($attr, ['category_id' => $pumpCategory->id])
            );
        }

        // 4. สร้าง Attributes สำหรับ Pipe (ปรับให้ตรงกับ static file)
        $pipeAttrs = [
            [
                'attribute_name' => 'pipeType',
                'display_name' => 'ประเภทท่อ',
                'data_type' => 'string',
                'unit' => '',
                'is_required' => false,
                'sort_order' => 0
            ],
            [
                'attribute_name' => 'pn',
                'display_name' => 'ทนแรงดัน',
                'data_type' => 'number',
                'unit' => 'PN',
                'is_required' => false,
                'sort_order' => 1
            ],
            [
                'attribute_name' => 'sizeMM',
                'display_name' => 'ขนาด',
                'data_type' => 'number',
                'unit' => 'มม.',
                'is_required' => false,
                'sort_order' => 2
            ],
            [
                'attribute_name' => 'sizeInch',
                'display_name' => 'ขนาด',
                'data_type' => 'string',
                'unit' => 'นิ้ว',
                'is_required' => false,
                'sort_order' => 3
            ],
            [
                'attribute_name' => 'lengthM',
                'display_name' => 'ความยาวต่อม้วน',
                'data_type' => 'number',
                'unit' => 'เมตร',
                'is_required' => false,
                'sort_order' => 4
            ]
        ];

        foreach ($pipeAttrs as $attr) {
            EquipmentAttribute::firstOrCreate(
                [
                    'category_id' => $pipeCategory->id,
                    'attribute_name' => $attr['attribute_name']
                ],
                array_merge($attr, ['category_id' => $pipeCategory->id])
            );
        }

        // 5. สร้างตัวอย่างข้อมูลจาก Static Files
        $this->createSprinklerData($sprinklerCategory);
        $this->createPumpData($pumpCategory);
        $this->createPipeData($pipeCategory);

        echo "Equipment seeding completed successfully!\n";
    }

    private function createSprinklerData($category)
    {
        $sprinklerData = [
            [
                'product_code' => '1-ECO-100',
                'name' => 'มินิสปริงเกอร์ 1/2"',
                'brand' => 'ไชโย',
                'image' => '/images/sprinkler/1-ECO-100.jpg',
                'price' => 1.00,
                'attributes' => [
                    'name' => 'มินิสปริงเกอร์ 1/2"',
                    'size_mm' => 20,
                    'size_inch' => 0.5,
                    'waterVolumeLitersPerHour' => [60, 120],
                    'radiusMeters' => [0.5, 1.5],
                    'pressureBar' => [0.5, 2]
                ]
            ],
            [
                'product_code' => '300',
                'name' => 'สปริงเกอร์ ใบหมุน2ชั้น เกลียวใน 3/4x1/2"',
                'brand' => 'ไชโย',
                'image' => 'https://f.btwcdn.com/store-50036/product/8d4c61e4-6cde-b0bc-09ed-624fd55b4468.png',
                'price' => 9.00,
                'attributes' => [
                    'name' => 'สปริงเกอร์ ใบหมุน2ชั้น เกลียวใน 3/4x1/2"',
                    'size_mm' => 32,
                    'size_inch' => 1,
                    'waterVolumeLitersPerHour' => [100, 900],
                    'radiusMeters' => [4, 5],
                    'pressureBar' => [0.5, 3]
                ]
            ],
            [
                'product_code' => '1-ECO-150',
                'name' => 'มินิสปริงเกอร์ 3/4"',
                'brand' => 'แชมป์',
                'image' => '/images/sprinkler/1-ECO-150.jpg',
                'price' => 2.00,
                'attributes' => [
                    'name' => 'มินิสปริงเกอร์ 3/4"',
                    'size_mm' => 25,
                    'size_inch' => 0.75,
                    'waterVolumeLitersPerHour' => [120, 240],
                    'radiusMeters' => [0.5, 1.5],
                    'pressureBar' => [0.5, 2]
                ]
            ]
        ];

        foreach ($sprinklerData as $data) {
            $equipment = Equipment::firstOrCreate(
                ['product_code' => $data['product_code']],
                [
                    'category_id' => $category->id,
                    'name' => $data['name'],
                    'brand' => $data['brand'],
                    'image' => $data['image'],
                    'price' => $data['price'],
                    'is_active' => true
                ]
            );

            $this->createAttributeValues($equipment, $category, $data['attributes']);
        }
    }

    private function createPumpData($category)
{
    $pumpData = [
        [
            'product_code' => '1-CPM130',
            'name' => 'ปั๊มน้ำ CPM130',
            'brand' => 'ไชโย',
            'image' => 'https://f.btwcdn.com/store-50036/product/42f86283-ba80-6f71-0a37-624e6dd42c83.png',
            'price' => 1820.00,
            'attributes' => [
                'powerHP' => 0.5,
                'powerKW' => 0.37,
                'phase' => 1,
                'inlet_size_inch' => 1,
                'outlet_size_inch' => 1,
                'flow_rate_lpm' => [20, 90],
                'head_m' => [25, 15],
                'max_head_m' => 25,
                'max_flow_rate_lpm' => 90,
                'suction_depth_m' => 9,
                'dimensions_cm' => '18 x 30 x 22',
                'weight_kg' => 12.5
            ],
            'accessories' => [
                [
                    'accessory_type' => 'foot_valve',
                    'name' => 'Foot Valve 1"',
                    'image' => 'https://example.com/foot-valve-1.jpg', // เพิ่มรูปภาพ
                    'size' => '1"',
                    'specifications' => ['material' => 'PVC', 'working_pressure' => '10 bar'],
                    'price' => 150.00,
                    'is_included' => true,
                    'sort_order' => 1
                ],
                [
                    'accessory_type' => 'check_valve',
                    'name' => 'Check Valve 1"',
                    'image' => 'https://example.com/check-valve-1.jpg', // เพิ่มรูปภาพ
                    'size' => '1"',
                    'specifications' => ['material' => 'Brass', 'working_pressure' => '16 bar'],
                    'price' => 200.00,
                    'is_included' => true,
                    'sort_order' => 2
                ]
            ]
        ],
        [
            'product_code' => '1-CPM075',
            'name' => 'ปั๊มน้ำ CPM075',
            'brand' => 'ไชโย',
            'image' => '/images/pump/1-CPM075.jpg',
            'price' => 1250.00,
            'attributes' => [
                'powerHP' => 0.25,
                'powerKW' => 0.18,
                'phase' => 1,
                'inlet_size_inch' => 0.75,
                'outlet_size_inch' => 0.75,
                'flow_rate_lpm' => [10, 45],
                'head_m' => [18, 8],
                'max_head_m' => 18,
                'max_flow_rate_lpm' => 45,
                'suction_depth_m' => 8,
                'dimensions_cm' => '15 x 25 x 18',
                'weight_kg' => 8.5
            ],
            'accessories' => [
                [
                    'accessory_type' => 'foot_valve',
                    'name' => 'Foot Valve 3/4"',
                    'image' => 'https://example.com/foot-valve-075.jpg', // เพิ่มรูปภาพ
                    'size' => '3/4"',
                    'specifications' => ['material' => 'PVC'],
                    'price' => 150.00,
                    'is_included' => true,
                    'sort_order' => 1
                ],
                [
                    'accessory_type' => 'check_valve',
                    'name' => 'Check Valve 3/4"',
                    'image' => 'https://example.com/check-valve-075.jpg', // เพิ่มรูปภาพ
                    'size' => '3/4"',
                    'specifications' => ['material' => 'Brass'],
                    'price' => 300.00,
                    'is_included' => true,
                    'sort_order' => 2
                ],
                [
                    'accessory_type' => 'pressure_gauge',
                    'name' => 'Pressure Gauge',
                    'image' => 'https://example.com/pressure-gauge.jpg', // เพิ่มรูปภาพ
                    'size' => '2"',
                    'specifications' => ['range' => '0-10 bar'],
                    'price' => 100.00,
                    'is_included' => false,
                    'sort_order' => 3
                ]
            ]
        ]
    ];

    foreach ($pumpData as $data) {
        $equipment = Equipment::firstOrCreate(
            ['product_code' => $data['product_code']],
            [
                'category_id' => $category->id,
                'name' => $data['name'],
                'brand' => $data['brand'],
                'image' => $data['image'],
                'price' => $data['price'],
                'is_active' => true
            ]
        );

        $this->createAttributeValues($equipment, $category, $data['attributes']);
        
        // สร้าง pump accessories
        if (isset($data['accessories'])) {
            foreach ($data['accessories'] as $accessoryData) {
                PumpAccessory::firstOrCreate(
                    [
                        'pump_id' => $equipment->id,
                        'accessory_type' => $accessoryData['accessory_type'],
                        'name' => $accessoryData['name']
                    ],
                    array_merge($accessoryData, ['pump_id' => $equipment->id])
                );
            }
        }
    }
}

    private function createPipeData($category)
    {
        $pipeData = [
            [
                'product_code' => '398-20-5PE100(PN16)',
                'name' => 'ท่อ HDPE PE100 PN16 ขนาด 20mm',
                'brand' => 'ไชโย',
                'image' => 'https://f.btwcdn.com/store-50036/product/7f312be9-9371-ddbd-aaff-640bf17172a6.jpg',
                'price' => 850.00,
                'attributes' => [
                    'pipeType' => 'HDPE PE 100',
                    'pn' => 16,
                    'sizeMM' => 20,
                    'sizeInch' => null,
                    'lengthM' => 50
                ]
            ],
            [
                'product_code' => '398-25-1PE100(PN16)',
                'name' => 'ท่อ HDPE PE100 PN16 ขนาด 25mm',
                'brand' => 'ไชโย',
                'image' => '/images/pipe/398-25-1PE100(PN16).jpg',
                'price' => 2500.00,
                'attributes' => [
                    'pipeType' => 'HDPE PE 100',
                    'pn' => 16,
                    'sizeMM' => 25,
                    'sizeInch' => null,
                    'lengthM' => 100
                ]
            ]
        ];

        foreach ($pipeData as $data) {
            $equipment = Equipment::firstOrCreate(
                ['product_code' => $data['product_code']],
                [
                    'category_id' => $category->id,
                    'name' => $data['name'],
                    'brand' => $data['brand'],
                    'image' => $data['image'],
                    'price' => $data['price'],
                    'is_active' => true
                ]
            );

            $this->createAttributeValues($equipment, $category, $data['attributes']);
        }
    }

    private function createAttributeValues($equipment, $category, $attributes)
    {
        foreach ($attributes as $attributeName => $value) {
            $attribute = EquipmentAttribute::where('category_id', $category->id)
                ->where('attribute_name', $attributeName)->first();
            
            if ($attribute && $value !== null) {
                EquipmentAttributeValue::firstOrCreate(
                    [
                        'equipment_id' => $equipment->id,
                        'attribute_id' => $attribute->id
                    ],
                    [
                        'value' => json_encode($value)
                    ]
                );
            }
        }
    }
}