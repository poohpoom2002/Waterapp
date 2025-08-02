<?php

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
        // สร้าง Categories
        $sprinklerCategory = EquipmentCategory::firstOrCreate(
            ['name' => 'sprinkler'],
            [
                'display_name' => 'สปริงเกอร์แบบหมุน/ยิงไกล',
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

        $pumpEquipmentCategory = EquipmentCategory::firstOrCreate(
            ['name' => 'pump_equipment'],
            [
                'display_name' => 'อุปกรณ์ปั๊ม',
                'description' => 'อุปกรณ์เสริมสำหรับปั๊มน้ำ',
                'icon' => '⚙️'
            ]
        );

        // สร้าง Attributes สำหรับ Sprinkler
        $this->createSprinklerAttributes($sprinklerCategory);
        
        // สร้าง Attributes สำหรับ Pump
        $this->createPumpAttributes($pumpCategory);
        
        // สร้าง Attributes สำหรับ Pipe
        $this->createPipeAttributes($pipeCategory);

        // สร้างข้อมูลสินค้า
        $this->createSprinklerData($sprinklerCategory);
        $this->createPumpData($pumpCategory);
        $this->createPipeData($pipeCategory);
        $this->createPumpEquipmentData($pumpEquipmentCategory);

        echo "Equipment seeding completed successfully!\n";
    }

    private function createSprinklerAttributes($sprinklerCategory)
    {
        $sprinklerAttrs = [
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
                'attribute_name' => 'waterVolumeLitersPerMinute',
                'display_name' => 'อัตราการไหล',
                'data_type' => 'array',
                'unit' => 'ลิตร/นาที',
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
    }

    private function createPumpAttributes($pumpCategory)
    {
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
    }

    private function createPipeAttributes($pipeCategory)
    {
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
                'display_name' => 'ความยาวต่อหน่วย',
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
    }

    private function createSprinklerData($category)
    {
        $data = [
            [
                'product_code' => 'SP-ROT-001',
                'name' => 'สปริงเกอร์แบบหมุน 360° ขนาด 1"',
                'brand' => 'Aqua-Tech',
                'image' => '',
                'price' => 280.00,
                'stock' => 50,
                'description' => 'สปริงเกอร์แบบหมุนรอบ 360 องศา เหมาะสำหรับพื้นที่ขนาดกลาง',
                'attributes' => [
                    'size_mm' => 25,
                    'size_inch' => 1,
                    'waterVolumeLitersPerMinute' => [3.33, 20],
                    'radiusMeters' => [8, 15],
                    'pressureBar' => [1.5, 4]
                ]
            ],
            [
                'product_code' => '1-ECO-100',
                'name' => 'มินิสปริงเกอร์ 1/2"',
                'brand' => 'ไชโย',
                'image' => '',
                'price' => 1.00,
                'stock' => 1000,
                'description' => 'มินิสปริงเกอร์ขนาดเล็ก เหมาะสำหรับแปลงผัก',
                'attributes' => [
                    'size_mm' => 20,
                    'size_inch' => 0.5,
                    'waterVolumeLitersPerMinute' => [1, 2],
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
                'stock' => 200,
                'description' => 'สปริงเกอร์ใบหมุน 2 ชั้น กระจายน้ำสม่ำเสมอ',
                'attributes' => [
                    'size_mm' => 32,
                    'size_inch' => 1,
                    'waterVolumeLitersPerMinute' => [1.67, 15],
                    'radiusMeters' => [4, 5],
                    'pressureBar' => [0.5, 3]
                ]
            ],
            [
                'product_code' => '1-ECO-150',
                'name' => 'มินิสปริงเกอร์ 3/4"',
                'brand' => 'แชมป์',
                'image' => '',
                'price' => 2.00,
                'stock' => 500,
                'description' => 'มินิสปริงเกอร์ขนาดกลาง เหมาะสำหรับสวนผลไม้',
                'attributes' => [
                    'size_mm' => 25,
                    'size_inch' => 0.75,
                    'waterVolumeLitersPerMinute' => [2, 4],
                    'radiusMeters' => [0.5, 1.5],
                    'pressureBar' => [0.5, 2]
                ]
            ],
        ];

        foreach ($data as $item) {
            $this->createEquipmentWithAttributes($category, $item);
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
                'stock' => 15,
                'description' => 'ปั๊มน้ำหอยโข่ง 0.5 HP เหมาะสำหรับงานทั่วไป',
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
                ]
            ],
            [
                'product_code' => '1-CPM075',
                'name' => 'ปั๊มน้ำ CPM075',
                'brand' => 'ไชโย',
                'image' => '',
                'price' => 1250.00,
                'stock' => 20,
                'description' => 'ปั๊มน้ำหอยโข่ง 0.25 HP ประหยัดไฟ',
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
                ]
            ],
            [
                'product_code' => 'MIT-SSP-255S',
                'name' => 'ปั๊มจุ่ม Mitsubishi SSP-255S',
                'brand' => 'Mitsubishi',
                'image' => '',
                'price' => 2800.00,
                'stock' => 8,
                'description' => 'ปั๊มจุ่มคุณภาพสูง เหมาะสำหรับบ่อน้ำลึก',
                'attributes' => [
                    'powerHP' => 0.33,
                    'powerKW' => 0.255,
                    'phase' => 1,
                    'inlet_size_inch' => null,
                    'outlet_size_inch' => 1.25,
                    'flow_rate_lpm' => [20, 100],
                    'head_m' => [8, 2],
                    'max_head_m' => 9.5,
                    'max_flow_rate_lpm' => 110,
                    'suction_depth_m' => null,
                    'dimensions_cm' => '16 x 16 x 32',
                    'weight_kg' => 5.5
                ]
            ]
        ];

        foreach ($pumpData as $data) {
            $this->createEquipmentWithAttributes($category, $data);
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
                'stock' => 5,
                'description' => 'ท่อ HDPE คุณภาพสูง ทนทาน ใช้กับระบบแรงดันสูง',
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
                'image' => '',
                'price' => 2500.00,
                'stock' => 3,
                'description' => 'ท่อ HDPE PE100 ขนาด 25mm ความยาว 100 เมตร',
                'attributes' => [
                    'pipeType' => 'HDPE PE 100',
                    'pn' => 16,
                    'sizeMM' => 25,
                    'sizeInch' => null,
                    'lengthM' => 100
                ]
            ],
            [
                'product_code' => 'PVC-SCG-1-8.5',
                'name' => 'ท่อ PVC สีฟ้า SCG 1" ชั้น 8.5',
                'brand' => 'SCG',
                'image' => '',
                'price' => 80.00,
                'stock' => 100,
                'description' => 'ท่อ PVC สีฟ้า SCG คุณภาพดี ความยาว 4 เมตร',
                'attributes' => [
                    'pipeType' => 'PVC',
                    'pn' => 8.5,
                    'sizeMM' => 25,
                    'sizeInch' => '1"',
                    'lengthM' => 4
                ]
            ]
        ];

        foreach ($pipeData as $data) {
            $this->createEquipmentWithAttributes($category, $data);
        }
    }

    private function createPumpEquipmentData($category)
    {
        $data = [
            [
                'product_code' => 'FV-001',
                'name' => 'Foot Valve 1"',
                'brand' => 'Standard',
                'image' => '',
                'price' => 150.00,
                'stock' => 50,
                'description' => 'วาล์วเท้าขนาด 1 นิ้ว วัสดุ PVC ป้องกันน้ำไหลกลับ'
            ],
            [
                'product_code' => 'CV-001',
                'name' => 'Check Valve 1"',
                'brand' => 'Standard',
                'image' => '',
                'price' => 200.00,
                'stock' => 40,
                'description' => 'วาล์วกันกลับขนาด 1 นิ้ว วัสดุทองเหลือง ทนทานสูง'
            ],
            [
                'product_code' => 'PG-001',
                'name' => 'Pressure Gauge 2"',
                'brand' => 'Standard',
                'image' => '',
                'price' => 100.00,
                'stock' => 30,
                'description' => 'เกจวัดแรงดัน 2 นิ้ว ช่วง 0-10 บาร์ มาตรฐานสากล'
            ],
            [
                'product_code' => 'PS-001',
                'name' => 'Pressure Switch',
                'brand' => 'Standard',
                'image' => '',
                'price' => 350.00,
                'stock' => 25,
                'description' => 'สวิตช์ควบคุมแรงดัน ปิด-เปิดอัตโนมัติ ปรับระดับแรงดันได้'
            ],
            [
                'product_code' => 'CM-001',
                'name' => 'Control Box',
                'brand' => 'Standard',
                'image' => '',
                'price' => 800.00,
                'stock' => 15,
                'description' => 'กล่องควบคุมปั๊มน้ำพร้อมรีเลย์ และระบบป้องกัน'
            ],
            [
                'product_code' => 'FT-001',
                'name' => 'Float Switch',
                'brand' => 'Standard',
                'image' => '',
                'price' => 250.00,
                'stock' => 35,
                'description' => 'สวิตช์ลูกลอย สำหรับควบคุมระดับน้ำอัตโนมัติ'
            ],
            [
                'product_code' => 'PR-001',
                'name' => 'Pressure Reducing Valve 1"',
                'brand' => 'Standard',
                'image' => '',
                'price' => 450.00,
                'stock' => 20,
                'description' => 'วาล์วลดแรงดัน 1 นิ้ว ปรับแรงดันเอาท์พุทได้'
            ],
            [
                'product_code' => 'ST-001',
                'name' => 'Suction Strainer 1"',
                'brand' => 'Standard',
                'image' => '',
                'price' => 120.00,
                'stock' => 45,
                'description' => 'ตะแกรงกรองขนาด 1 นิ้ว กรองสิ่งสกปรกในน้ำ'
            ],
            [
                'product_code' => 'CS-001',
                'name' => 'Cable Submersible 3x1.5',
                'brand' => 'Standard',
                'image' => '',
                'price' => 85.00,
                'stock' => 100,
                'description' => 'สายไฟปั๊มจุ่ม 3 เส้น 1.5 ตรมม. ทนน้ำ ยาว 1 เมตร'
            ],
            [
                'product_code' => 'JF-001',
                'name' => 'Jet Fitting 1"',
                'brand' => 'Standard',
                'image' => '',
                'price' => 180.00,
                'stock' => 30,
                'description' => 'อุปกรณ์เจ็ท 1 นิ้ว สำหรับปั๊มแบบเจ็ท เพิ่มประสิทธิภาพ'
            ],
            [
                'product_code' => 'TK-001',
                'name' => 'Tank Tee 1"',
                'brand' => 'Standard',
                'image' => '',
                'price' => 95.00,
                'stock' => 60,
                'description' => 'ข้อต่อแท้งค์ 1 นิ้ว สำหรับต่อถังเก็บน้ำ'
            ],
            [
                'product_code' => 'VB-001',
                'name' => 'Vibration Pad',
                'brand' => 'Standard',
                'image' => '',
                'price' => 75.00,
                'stock' => 40,
                'description' => 'แผ่นรองปั๊ม ลดการสั่นสะเทือน ยาง EPDM คุณภาพสูง'
            ],
            [
                'product_code' => 'TC-001',
                'name' => 'Thermal Cutout',
                'brand' => 'Standard',
                'image' => '',
                'price' => 320.00,
                'stock' => 25,
                'description' => 'อุปกรณ์ป้องกันความร้อนเกิน ตัดไฟอัตโนมัติเมื่อร้อนเกิน'
            ]
        ];

        foreach ($data as $item) {
            // สร้างโดยไม่มี attributes
            Equipment::firstOrCreate(
                ['product_code' => $item['product_code']],
                [
                    'category_id' => $category->id,
                    'name' => $item['name'],
                    'brand' => $item['brand'],
                    'image' => $item['image'],
                    'price' => $item['price'],
                    'stock' => $item['stock'],
                    'description' => $item['description'],
                    'is_active' => true
                ]
            );
        }
    }

    private function createEquipmentWithAttributes($category, $data)
    {
        $equipment = Equipment::firstOrCreate(
            ['product_code' => $data['product_code']],
            [
                'category_id' => $category->id,
                'name' => $data['name'],
                'brand' => $data['brand'],
                'image' => $data['image'],
                'price' => $data['price'],
                'stock' => $data['stock'] ?? null,
                'description' => $data['description'] ?? null,
                'is_active' => true
            ]
        );

        // สร้าง attributes เฉพาะกรณีที่มีและไม่ใช่ pump_equipment
        if (isset($data['attributes']) && $category->name !== 'pump_equipment') {
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