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
                'display_name' => 'สปริงเกอร์แบบหมุน/ยิงไกล',
                'description' => 'หัวสปริงเกอร์สำหรับรดน้ำ',
                'icon' => '💧'
            ]
        );

        $popUpSprinklerCategory = EquipmentCategory::firstOrCreate(
            ['name' => 'pop_up_sprinkler'],
            [
                'display_name' => 'หัว Pop‑Up ยก–หดได้',
                'description' => 'หัวสปริงเกอร์ชนิด Pop-up ยก-หดได้',
                'icon' => '💧'
            ]
        );

        $miniSprinklerCategory = EquipmentCategory::firstOrCreate(
            ['name' => 'mini_sprinkler'],
            [
                'display_name' => 'มินิสปริงเกอร์',
                'description' => 'มินิสปริงเกอร์สำหรับรดน้ำ',
                'icon' => '💧'
            ]
        );

        $singleSideSprinklerCategory = EquipmentCategory::firstOrCreate(
            ['name' => 'single_side_sprinkler'],
            [
                'display_name' => 'หัวฉีดด้านเดียวปรับมุม',
                'description' => 'หัวฉีดน้ำด้านเดียว สามารถปรับมุมได้',
                'icon' => '💧'
            ]
        );

        $butterflySprinklerCategory = EquipmentCategory::firstOrCreate(
            ['name' => 'butterfly_sprinkler'],
            [
                'display_name' => 'หัวฉีดผีเสื้อ',
                'description' => 'หัวสปริงเกอร์แบบหัวฉีดผีเสื้อ',
                'icon' => '💧'
            ]
        );

        $mistNozzleCategory = EquipmentCategory::firstOrCreate(
            ['name' => 'mist_nozzle'],
            [
                'display_name' => 'หัวพ่นหมอก',
                'description' => 'หัวพ่นหมอกสำหรับสร้างความชื้น',
                'icon' => '💧'
            ]
        );

        $impactSprinklerCategory = EquipmentCategory::firstOrCreate(
            ['name' => 'impact_sprinkler'],
            [
                'display_name' => 'สปริงเกอร์ชนิดกระแทก',
                'description' => 'สปริงเกอร์ชนิดกระแทกสำหรับรดน้ำระยะไกล',
                'icon' => '💧'
            ]
        );

        $gearDriveNozzleCategory = EquipmentCategory::firstOrCreate(
            ['name' => 'gear_drive_nozzle'],
            [
                'display_name' => 'หัวฉีดเกียร์ไดร์ฟ ปรับแรงและมุม',
                'description' => 'หัวฉีดแบบเกียร์ไดร์ฟ สามารถปรับแรงและมุมได้',
                'icon' => '💧'
            ]
        );

        $dripSprayTapeCategory = EquipmentCategory::firstOrCreate(
            ['name' => 'drip_spray_tape'],
            [
                'display_name' => 'เทปน้ำหยดหรือสเปรย์ แบบม้วน',
                'description' => 'เทปน้ำหยดหรือสเปรย์สำหรับรดน้ำพืชแถวยาว',
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

        // 2. สร้าง Attributes สำหรับ Sprinkler และประเภทที่เกี่ยวข้อง
        $allSprinklerCategories = [
            $sprinklerCategory,
            $popUpSprinklerCategory,
            $miniSprinklerCategory,
            $singleSideSprinklerCategory,
            $butterflySprinklerCategory,
            $mistNozzleCategory,
            $impactSprinklerCategory,
            $gearDriveNozzleCategory,
            $dripSprayTapeCategory,
        ];

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
        
        foreach ($allSprinklerCategories as $category) {
            foreach ($sprinklerAttrs as $attr) {
                EquipmentAttribute::firstOrCreate(
                    [
                        'category_id' => $category->id,
                        'attribute_name' => $attr['attribute_name']
                    ],
                    array_merge($attr, ['category_id' => $category->id])
                );
            }
        }

        // 3. สร้าง Attributes สำหรับ Pump
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

        // 4. สร้าง Attributes สำหรับ Pipe
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

        // 5. สร้างตัวอย่างข้อมูลสำหรับแต่ละ Category
        $this->createSprinklerData($sprinklerCategory);
        $this->createPopUpSprinklerData($popUpSprinklerCategory);
        $this->createMiniSprinklerData($miniSprinklerCategory);
        $this->createSingleSideSprinklerData($singleSideSprinklerCategory);
        $this->createButterflySprinklerData($butterflySprinklerCategory);
        $this->createMistNozzleData($mistNozzleCategory);
        $this->createImpactSprinklerData($impactSprinklerCategory);
        $this->createGearDriveNozzleData($gearDriveNozzleCategory);
        $this->createDripSprayTapeData($dripSprayTapeCategory);
        $this->createPumpData($pumpCategory);
        $this->createPipeData($pipeCategory);

        echo "Equipment seeding completed successfully!\n";
    }

    // สปริงเกอร์แบบหมุน/ยิงไกล - 15 ตัว
    private function createSprinklerData($category)
    {
        $sprinklerData = [
            [
                'product_code' => 'SP-ROT-001',
                'name' => 'สปริงเกอร์แบบหมุน 360° ขนาด 1"',
                'brand' => 'Aqua-Tech',
                'image' => '/images/sprinkler/sp-rot-001.jpg',
                'price' => 280.00,
                'attributes' => [
                    'name' => 'สปริงเกอร์แบบหมุน 360° ขนาด 1"',
                    'size_mm' => 25,
                    'size_inch' => 1,
                    'waterVolumeLitersPerHour' => [200, 1200],
                    'radiusMeters' => [8, 15],
                    'pressureBar' => [1.5, 4]
                ]
            ],
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
            ],
            [
                'product_code' => 'SP-ROT-002',
                'name' => 'สปริงเกอร์หมุนโลหะ 1.25"',
                'brand' => 'AquaMax',
                'image' => '/images/sprinkler/sp-rot-002.jpg',
                'price' => 450.00,
                'attributes' => [
                    'name' => 'สปริงเกอร์หมุนโลหะ 1.25"',
                    'size_mm' => 32,
                    'size_inch' => 1.25,
                    'waterVolumeLitersPerHour' => [400, 1800],
                    'radiusMeters' => [10, 18],
                    'pressureBar' => [2, 5]
                ]
            ],
            [
                'product_code' => 'SP-360-003',
                'name' => 'สปริงเกอร์ 360° ปรับความแรง ขนาด 2"',
                'brand' => 'WaterPro',
                'image' => '/images/sprinkler/sp-360-003.jpg',
                'price' => 750.00,
                'attributes' => [
                    'name' => 'สปริงเกอร์ 360° ปรับความแรง ขนาด 2"',
                    'size_mm' => 50,
                    'size_inch' => 2,
                    'waterVolumeLitersPerHour' => [800, 3000],
                    'radiusMeters' => [15, 25],
                    'pressureBar' => [2.5, 6]
                ]
            ],
            [
                'product_code' => 'ROT-MINI-004',
                'name' => 'สปริงเกอร์มินิ 180° ขนาด 3/8"',
                'brand' => 'GreenTech',
                'image' => '/images/sprinkler/rot-mini-004.jpg',
                'price' => 85.00,
                'attributes' => [
                    'name' => 'สปริงเกอร์มินิ 180° ขนาด 3/8"',
                    'size_mm' => 10,
                    'size_inch' => 0.375,
                    'waterVolumeLitersPerHour' => [40, 90],
                    'radiusMeters' => [1, 3],
                    'pressureBar' => [0.8, 2.5]
                ]
            ],
            [
                'product_code' => 'SP-HEAVY-005',
                'name' => 'สปริงเกอร์หนักหมุนช้า 1.5"',
                'brand' => 'PowerSpray',
                'image' => '/images/sprinkler/sp-heavy-005.jpg',
                'price' => 620.00,
                'attributes' => [
                    'name' => 'สปริงเกอร์หนักหมุนช้า 1.5"',
                    'size_mm' => 38,
                    'size_inch' => 1.5,
                    'waterVolumeLitersPerHour' => [600, 2400],
                    'radiusMeters' => [12, 20],
                    'pressureBar' => [2, 4.5]
                ]
            ],
            [
                'product_code' => 'AGRI-SPR-006',
                'name' => 'สปริงเกอร์เกษตร หัวทองเหลือง 1"',
                'brand' => 'FarmTech',
                'image' => '/images/sprinkler/agri-spr-006.jpg',
                'price' => 320.00,
                'attributes' => [
                    'name' => 'สปริงเกอร์เกษตร หัวทองเหลือง 1"',
                    'size_mm' => 25,
                    'size_inch' => 1,
                    'waterVolumeLitersPerHour' => [250, 1400],
                    'radiusMeters' => [9, 16],
                    'pressureBar' => [1.8, 4.2]
                ]
            ],
            [
                'product_code' => 'SP-TURBO-007',
                'name' => 'สปริงเกอร์เทอร์โบ หมุนเร็ว 3/4"',
                'brand' => 'TurboSpray',
                'image' => '/images/sprinkler/sp-turbo-007.jpg',
                'price' => 180.00,
                'attributes' => [
                    'name' => 'สปริงเกอร์เทอร์โบ หมุนเร็ว 3/4"',
                    'size_mm' => 20,
                    'size_inch' => 0.75,
                    'waterVolumeLitersPerHour' => [150, 800],
                    'radiusMeters' => [6, 12],
                    'pressureBar' => [1.5, 3.5]
                ]
            ],
            [
                'product_code' => 'SP-LONG-008',
                'name' => 'สปริงเกอร์ระยะไกล 2.5"',
                'brand' => 'LongRange',
                'image' => '/images/sprinkler/sp-long-008.jpg',
                'price' => 1250.00,
                'attributes' => [
                    'name' => 'สปริงเกอร์ระยะไกล 2.5"',
                    'size_mm' => 63,
                    'size_inch' => 2.5,
                    'waterVolumeLitersPerHour' => [1200, 4500],
                    'radiusMeters' => [20, 35],
                    'pressureBar' => [3, 7]
                ]
            ],
            [
                'product_code' => 'ECO-ROT-009',
                'name' => 'สปริงเกอร์ประหยัดน้ำ 1/2"',
                'brand' => 'EcoWater',
                'image' => '/images/sprinkler/eco-rot-009.jpg',
                'price' => 95.00,
                'attributes' => [
                    'name' => 'สปริงเกอร์ประหยัดน้ำ 1/2"',
                    'size_mm' => 15,
                    'size_inch' => 0.5,
                    'waterVolumeLitersPerHour' => [80, 200],
                    'radiusMeters' => [3, 6],
                    'pressureBar' => [1, 2.8]
                ]
            ],
            [
                'product_code' => 'SP-DUAL-010',
                'name' => 'สปริงเกอร์หัวคู่ 1"x3/4"',
                'brand' => 'DualSpray',
                'image' => '/images/sprinkler/sp-dual-010.jpg',
                'price' => 380.00,
                'attributes' => [
                    'name' => 'สปริงเกอร์หัวคู่ 1"x3/4"',
                    'size_mm' => 25,
                    'size_inch' => 1,
                    'waterVolumeLitersPerHour' => [300, 1600],
                    'radiusMeters' => [8, 14],
                    'pressureBar' => [1.5, 4]
                ]
            ],
            [
                'product_code' => 'SP-MINI-011',
                'name' => 'มินิสปริงเกอร์พลาสติก 1/4"',
                'brand' => 'MiniSpray',
                'image' => '/images/sprinkler/sp-mini-011.jpg',
                'price' => 25.00,
                'attributes' => [
                    'name' => 'มินิสปริงเกอร์พลาสติก 1/4"',
                    'size_mm' => 6,
                    'size_inch' => 0.25,
                    'waterVolumeLitersPerHour' => [20, 50],
                    'radiusMeters' => [0.8, 2],
                    'pressureBar' => [0.5, 2]
                ]
            ],
            [
                'product_code' => 'SP-PREMIUM-012',
                'name' => 'สปริงเกอร์พรีเมี่ยม สแตนเลส 1.25"',
                'brand' => 'Premium',
                'image' => '/images/sprinkler/sp-premium-012.jpg',
                'price' => 890.00,
                'attributes' => [
                    'name' => 'สปริงเกอร์พรีเมี่ยม สแตนเลส 1.25"',
                    'size_mm' => 32,
                    'size_inch' => 1.25,
                    'waterVolumeLitersPerHour' => [500, 2200],
                    'radiusMeters' => [12, 22],
                    'pressureBar' => [2.2, 5.5]
                ]
            ]
        ];

        foreach ($sprinklerData as $data) {
            $this->createEquipmentWithAttributes($category, $data);
        }
    }

    // ปั๊มน้ำ - 15 ตัว
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
                ]
            ],
            [
                'product_code' => 'MIT-SSP-255S',
                'name' => 'ปั๊มจุ่ม Mitsubishi SSP-255S',
                'brand' => 'Mitsubishi',
                'image' => '/images/pump/MIT-SSP-255S.jpg',
                'price' => 2800.00,
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
            ],
            [
                'product_code' => 'PUMP-001',
                'name' => 'ปั๊มน้ำ 1HP 3เฟส',
                'brand' => 'PowerPump',
                'image' => '/images/pump/pump-001.jpg',
                'price' => 3200.00,
                'attributes' => [
                    'powerHP' => 1,
                    'powerKW' => 0.75,
                    'phase' => 3,
                    'inlet_size_inch' => 1.5,
                    'outlet_size_inch' => 1.25,
                    'flow_rate_lpm' => [40, 180],
                    'head_m' => [35, 20],
                    'max_head_m' => 35,
                    'max_flow_rate_lpm' => 180,
                    'suction_depth_m' => 9,
                    'dimensions_cm' => '22 x 35 x 28',
                    'weight_kg' => 18.5
                ]
            ],
            [
                'product_code' => 'PUMP-002',
                'name' => 'ปั๊มน้ำ 2HP เหล็กหล่อ',
                'brand' => 'HeavyDuty',
                'image' => '/images/pump/pump-002.jpg',
                'price' => 4850.00,
                'attributes' => [
                    'powerHP' => 2,
                    'powerKW' => 1.5,
                    'phase' => 3,
                    'inlet_size_inch' => 2,
                    'outlet_size_inch' => 1.5,
                    'flow_rate_lpm' => [80, 350],
                    'head_m' => [45, 25],
                    'max_head_m' => 45,
                    'max_flow_rate_lpm' => 350,
                    'suction_depth_m' => 10,
                    'dimensions_cm' => '28 x 42 x 35',
                    'weight_kg' => 32.0
                ]
            ],
            [
                'product_code' => 'SUBMERSIBLE-001',
                'name' => 'ปั๊มจุ่มสแตนเลส 0.75HP',
                'brand' => 'AquaDeep',
                'image' => '/images/pump/submersible-001.jpg',
                'price' => 3650.00,
                'attributes' => [
                    'powerHP' => 0.75,
                    'powerKW' => 0.55,
                    'phase' => 1,
                    'inlet_size_inch' => null,
                    'outlet_size_inch' => 1,
                    'flow_rate_lpm' => [30, 120],
                    'head_m' => [25, 10],
                    'max_head_m' => 28,
                    'max_flow_rate_lpm' => 130,
                    'suction_depth_m' => null,
                    'dimensions_cm' => '18 x 18 x 45',
                    'weight_kg' => 12.8
                ]
            ],
            [
                'product_code' => 'BOOSTER-001',
                'name' => 'ปั๊มเพิ่มแรงดัน 0.8HP',
                'brand' => 'PressureMax',
                'image' => '/images/pump/booster-001.jpg',
                'price' => 2980.00,
                'attributes' => [
                    'powerHP' => 0.8,
                    'powerKW' => 0.6,
                    'phase' => 1,
                    'inlet_size_inch' => 1,
                    'outlet_size_inch' => 1,
                    'flow_rate_lpm' => [25, 95],
                    'head_m' => [38, 20],
                    'max_head_m' => 40,
                    'max_flow_rate_lpm' => 100,
                    'suction_depth_m' => 8,
                    'dimensions_cm' => '20 x 32 x 25',
                    'weight_kg' => 15.2
                ]
            ],
            [
                'product_code' => 'PUMP-MINI-001',
                'name' => 'ปั๊มน้ำมินิ 0.3HP',
                'brand' => 'MiniFlow',
                'image' => '/images/pump/pump-mini-001.jpg',
                'price' => 890.00,
                'attributes' => [
                    'powerHP' => 0.3,
                    'powerKW' => 0.22,
                    'phase' => 1,
                    'inlet_size_inch' => 0.75,
                    'outlet_size_inch' => 0.75,
                    'flow_rate_lpm' => [15, 60],
                    'head_m' => [22, 12],
                    'max_head_m' => 22,
                    'max_flow_rate_lpm' => 60,
                    'suction_depth_m' => 7,
                    'dimensions_cm' => '14 x 22 x 18',
                    'weight_kg' => 6.8
                ]
            ],
            [
                'product_code' => 'INDUSTRIAL-001',
                'name' => 'ปั๊มอุตสาหกรรม 5HP',
                'brand' => 'Industrial',
                'image' => '/images/pump/industrial-001.jpg',
                'price' => 12500.00,
                'attributes' => [
                    'powerHP' => 5,
                    'powerKW' => 3.7,
                    'phase' => 3,
                    'inlet_size_inch' => 3,
                    'outlet_size_inch' => 2.5,
                    'flow_rate_lpm' => [200, 800],
                    'head_m' => [65, 35],
                    'max_head_m' => 70,
                    'max_flow_rate_lpm' => 850,
                    'suction_depth_m' => 12,
                    'dimensions_cm' => '45 x 65 x 52',
                    'weight_kg' => 85.0
                ]
            ],
            [
                'product_code' => 'SOLAR-PUMP-001',
                'name' => 'ปั๊มพลังงานแสงอาทิตย์ 1HP',
                'brand' => 'SolarTech',
                'image' => '/images/pump/solar-pump-001.jpg',
                'price' => 8500.00,
                'attributes' => [
                    'powerHP' => 1,
                    'powerKW' => 0.75,
                    'phase' => null,
                    'inlet_size_inch' => 1.25,
                    'outlet_size_inch' => 1,
                    'flow_rate_lpm' => [35, 150],
                    'head_m' => [30, 18],
                    'max_head_m' => 32,
                    'max_flow_rate_lpm' => 160,
                    'suction_depth_m' => 25,
                    'dimensions_cm' => '20 x 35 x 28',
                    'weight_kg' => 16.5
                ]
            ],
            [
                'product_code' => 'JET-PUMP-001',
                'name' => 'ปั๊มเจ็ท 1.5HP ถังสะสม',
                'brand' => 'JetMax',
                'image' => '/images/pump/jet-pump-001.jpg',
                'price' => 4200.00,
                'attributes' => [
                    'powerHP' => 1.5,
                    'powerKW' => 1.1,
                    'phase' => 1,
                    'inlet_size_inch' => 1.25,
                    'outlet_size_inch' => 1,
                    'flow_rate_lpm' => [50, 220],
                    'head_m' => [42, 28],
                    'max_head_m' => 45,
                    'max_flow_rate_lpm' => 230,
                    'suction_depth_m' => 20,
                    'dimensions_cm' => '35 x 45 x 65',
                    'weight_kg' => 28.5
                ]
            ],
            [
                'product_code' => 'CENTRIFUGAL-001',
                'name' => 'ปั๊มเหวี่ยงออกจากศูนย์กล 3HP',
                'brand' => 'CentriMax',
                'image' => '/images/pump/centrifugal-001.jpg',
                'price' => 7800.00,
                'attributes' => [
                    'powerHP' => 3,
                    'powerKW' => 2.2,
                    'phase' => 3,
                    'inlet_size_inch' => 2.5,
                    'outlet_size_inch' => 2,
                    'flow_rate_lpm' => [120, 500],
                    'head_m' => [55, 30],
                    'max_head_m' => 58,
                    'max_flow_rate_lpm' => 520,
                    'suction_depth_m' => 10,
                    'dimensions_cm' => '38 x 52 x 42',
                    'weight_kg' => 55.0
                ]
            ],
            [
                'product_code' => 'MULTI-STAGE-001',
                'name' => 'ปั๊มหลายชั้น 2.5HP',
                'brand' => 'MultiFlow',
                'image' => '/images/pump/multi-stage-001.jpg',
                'price' => 6850.00,
                'attributes' => [
                    'powerHP' => 2.5,
                    'powerKW' => 1.85,
                    'phase' => 3,
                    'inlet_size_inch' => 1.5,
                    'outlet_size_inch' => 1.25,
                    'flow_rate_lpm' => [60, 280],
                    'head_m' => [85, 45],
                    'max_head_m' => 90,
                    'max_flow_rate_lpm' => 300,
                    'suction_depth_m' => 9,
                    'dimensions_cm' => '25 x 48 x 35',
                    'weight_kg' => 42.0
                ]
            ],
            [
                'product_code' => 'DEEP-WELL-001',
                'name' => 'ปั๊มบาดาลน้ำลึก 4"',
                'brand' => 'DeepWater',
                'image' => '/images/pump/deep-well-001.jpg',
                'price' => 9500.00,
                'attributes' => [
                    'powerHP' => 1.5,
                    'powerKW' => 1.1,
                    'phase' => 3,
                    'inlet_size_inch' => null,
                    'outlet_size_inch' => 1.25,
                    'flow_rate_lpm' => [40, 180],
                    'head_m' => [120, 60],
                    'max_head_m' => 130,
                    'max_flow_rate_lpm' => 200,
                    'suction_depth_m' => null,
                    'dimensions_cm' => '10 x 10 x 85',
                    'weight_kg' => 18.5
                ]
            ],
            [
                'product_code' => 'VARIABLE-SPEED-001',
                'name' => 'ปั๊มปรับความเร็วได้ 3HP',
                'brand' => 'VariFlow',
                'image' => '/images/pump/variable-speed-001.jpg',
                'price' => 15800.00,
                'attributes' => [
                    'powerHP' => 3,
                    'powerKW' => 2.2,
                    'phase' => 3,
                    'inlet_size_inch' => 2,
                    'outlet_size_inch' => 1.5,
                    'flow_rate_lpm' => [50, 450],
                    'head_m' => [60, 25],
                    'max_head_m' => 65,
                    'max_flow_rate_lpm' => 480,
                    'suction_depth_m' => 10,
                    'dimensions_cm' => '35 x 55 x 45',
                    'weight_kg' => 68.0
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
        }
    }

    // ท่อ - 15 ตัว
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
            ],
            [
                'product_code' => 'PVC-SCG-1-8.5',
                'name' => 'ท่อ PVC สีฟ้า SCG 1" ชั้น 8.5',
                'brand' => 'SCG',
                'image' => '/images/pipe/PVC-SCG-1-8.5.jpg',
                'price' => 80.00,
                'attributes' => [
                    'pipeType' => 'PVC',
                    'pn' => 8.5,
                    'sizeMM' => 25,
                    'sizeInch' => '1"',
                    'lengthM' => 4
                ]
            ],
            [
                'product_code' => 'HDPE-32-PN10',
                'name' => 'ท่อ HDPE PE80 PN10 ขนาด 32mm',
                'brand' => 'Thai Pipe',
                'image' => '/images/pipe/hdpe-32-pn10.jpg',
                'price' => 1250.00,
                'attributes' => [
                    'pipeType' => 'HDPE PE 80',
                    'pn' => 10,
                    'sizeMM' => 32,
                    'sizeInch' => null,
                    'lengthM' => 100
                ]
            ],
            [
                'product_code' => 'PVC-1.5-13.5',
                'name' => 'ท่อ PVC สีฟ้า 1.5" ชั้น 13.5',
                'brand' => 'SCG',
                'image' => '/images/pipe/pvc-1.5-13.5.jpg',
                'price' => 185.00,
                'attributes' => [
                    'pipeType' => 'PVC',
                    'pn' => 13.5,
                    'sizeMM' => 40,
                    'sizeInch' => '1.5"',
                    'lengthM' => 4
                ]
            ],
            [
                'product_code' => 'HDPE-40-PN16',
                'name' => 'ท่อ HDPE PE100 PN16 ขนาด 40mm',
                'brand' => 'ไชโย',
                'image' => '/images/pipe/hdpe-40-pn16.jpg',
                'price' => 3800.00,
                'attributes' => [
                    'pipeType' => 'HDPE PE 100',
                    'pn' => 16,
                    'sizeMM' => 40,
                    'sizeInch' => null,
                    'lengthM' => 100
                ]
            ],
            [
                'product_code' => 'PVC-2-17',
                'name' => 'ท่อ PVC สีฟ้า 2" ชั้น 17',
                'brand' => 'SCG',
                'image' => '/images/pipe/pvc-2-17.jpg',
                'price' => 280.00,
                'attributes' => [
                    'pipeType' => 'PVC',
                    'pn' => 17,
                    'sizeMM' => 50,
                    'sizeInch' => '2"',
                    'lengthM' => 4
                ]
            ],
            [
                'product_code' => 'PPR-25-PN20',
                'name' => 'ท่อ PPR PN20 ขนาด 25mm',
                'brand' => 'Wavin',
                'image' => '/images/pipe/ppr-25-pn20.jpg',
                'price' => 95.00,
                'attributes' => [
                    'pipeType' => 'PPR',
                    'pn' => 20,
                    'sizeMM' => 25,
                    'sizeInch' => null,
                    'lengthM' => 4
                ]
            ],
            [
                'product_code' => 'HDPE-50-PN10',
                'name' => 'ท่อ HDPE PE80 PN10 ขนาด 50mm',
                'brand' => 'Thai Pipe',
                'image' => '/images/pipe/hdpe-50-pn10.jpg',
                'price' => 2850.00,
                'attributes' => [
                    'pipeType' => 'HDPE PE 80',
                    'pn' => 10,
                    'sizeMM' => 50,
                    'sizeInch' => null,
                    'lengthM' => 50
                ]
            ],
            [
                'product_code' => 'PVC-0.5-5',
                'name' => 'ท่อ PVC น้ำเย็น 1/2" ชั้น 5',
                'brand' => 'SCG',
                'image' => '/images/pipe/pvc-0.5-5.jpg',
                'price' => 28.00,
                'attributes' => [
                    'pipeType' => 'PVC',
                    'pn' => 5,
                    'sizeMM' => 15,
                    'sizeInch' => '1/2"',
                    'lengthM' => 4
                ]
            ],
            [
                'product_code' => 'PPR-32-PN25',
                'name' => 'ท่อ PPR PN25 ขนาด 32mm',
                'brand' => 'Wavin',
                'image' => '/images/pipe/ppr-32-pn25.jpg',
                'price' => 145.00,
                'attributes' => [
                    'pipeType' => 'PPR',
                    'pn' => 25,
                    'sizeMM' => 32,
                    'sizeInch' => null,
                    'lengthM' => 4
                ]
            ],
            [
                'product_code' => 'HDPE-63-PN16',
                'name' => 'ท่อ HDPE PE100 PN16 ขนาด 63mm',
                'brand' => 'ไชโย',
                'image' => '/images/pipe/hdpe-63-pn16.jpg',
                'price' => 6500.00,
                'attributes' => [
                    'pipeType' => 'HDPE PE 100',
                    'pn' => 16,
                    'sizeMM' => 63,
                    'sizeInch' => null,
                    'lengthM' => 100
                ]
            ],
            [
                'product_code' => 'PVC-3-17',
                'name' => 'ท่อ PVC สีฟ้า 3" ชั้น 17',
                'brand' => 'SCG',
                'image' => '/images/pipe/pvc-3-17.jpg',
                'price' => 485.00,
                'attributes' => [
                    'pipeType' => 'PVC',
                    'pn' => 17,
                    'sizeMM' => 75,
                    'sizeInch' => '3"',
                    'lengthM' => 4
                ]
            ],
            [
                'product_code' => 'PE-FLEX-20',
                'name' => 'ท่อ PE ยืดหยุ่น 20mm ม้วน',
                'brand' => 'FlexPipe',
                'image' => '/images/pipe/pe-flex-20.jpg',
                'price' => 380.00,
                'attributes' => [
                    'pipeType' => 'PE Flexible',
                    'pn' => 6,
                    'sizeMM' => 20,
                    'sizeInch' => null,
                    'lengthM' => 50
                ]
            ],
            [
                'product_code' => 'HDPE-90-PN10',
                'name' => 'ท่อ HDPE PE80 PN10 ขนาด 90mm',
                'brand' => 'Thai Pipe',
                'image' => '/images/pipe/hdpe-90-pn10.jpg',
                'price' => 8900.00,
                'attributes' => [
                    'pipeType' => 'HDPE PE 80',
                    'pn' => 10,
                    'sizeMM' => 90,
                    'sizeInch' => null,
                    'lengthM' => 50
                ]
            ]
        ];

        foreach ($pipeData as $data) {
            $this->createEquipmentWithAttributes($category, $data);
        }
    }

    // เก็บ method เดิมๆ สำหรับหมวดอื่น
    private function createPopUpSprinklerData($category)
    {
        $sprinklerPopUpData = [
            [
                'product_code' => 'RB-1804',
                'name' => 'สปริงเกอร์ Pop-up 4" Rain Bird 1800 Series',
                'brand' => 'Rain Bird',
                'image' => '/images/sprinkler/RB-1804.jpg',
                'price' => 150.00,
                'attributes' => [
                    'name' => 'สปริงเกอร์ Pop-up 4" 1800 Series',
                    'size_mm' => null,
                    'size_inch' => 0.5,
                    'waterVolumeLitersPerHour' => [250, 750],
                    'radiusMeters' => [3, 5],
                    'pressureBar' => [1, 2.1]
                ]
            ]
        ];

        foreach ($sprinklerPopUpData as $data) {
            $this->createEquipmentWithAttributes($category, $data);
        }
    }

    private function createMiniSprinklerData($category)
    {
        $data = [
            'product_code' => 'MINI-SPR-001',
            'name' => 'มินิสปริงเกอร์ขาตั้ง ขนาด 1/2"',
            'brand' => 'Garden Pro',
            'image' => '/images/sprinkler/mini-spr-001.jpg',
            'price' => 45.00,
            'attributes' => [
                'name' => 'มินิสปริงเกอร์ขาตั้ง ขนาด 1/2"',
                'size_mm' => 15,
                'size_inch' => 0.5,
                'waterVolumeLitersPerHour' => [30, 80],
                'radiusMeters' => [0.8, 2.5],
                'pressureBar' => [0.8, 2.5]
            ]
        ];

        $this->createEquipmentWithAttributes($category, $data);
    }

    private function createSingleSideSprinklerData($category)
    {
        $data = [
            'product_code' => 'SS-ADJ-001',
            'name' => 'หัวฉีดปรับมุมด้านเดียว 180° ขนาด 3/4"',
            'brand' => 'Flex-Spray',
            'image' => '/images/sprinkler/ss-adj-001.jpg',
            'price' => 125.00,
            'attributes' => [
                'name' => 'หัวฉีดปรับมุมด้านเดียว 180° ขนาด 3/4"',
                'size_mm' => 20,
                'size_inch' => 0.75,
                'waterVolumeLitersPerHour' => [150, 450],
                'radiusMeters' => [3, 8],
                'pressureBar' => [1, 3]
            ]
        ];

        $this->createEquipmentWithAttributes($category, $data);
    }

    private function createButterflySprinklerData($category)
    {
        $data = [
            'product_code' => 'BF-SPR-001',
            'name' => 'หัวฉีดผีเสื้อ 4 ทิศทาง ขนาด 1/2"',
            'brand' => 'Butterfly',
            'image' => '/images/sprinkler/bf-spr-001.jpg',
            'price' => 85.00,
            'attributes' => [
                'name' => 'หัวฉีดผีเสื้อ 4 ทิศทาง ขนาด 1/2"',
                'size_mm' => 15,
                'size_inch' => 0.5,
                'waterVolumeLitersPerHour' => [100, 300],
                'radiusMeters' => [2, 5],
                'pressureBar' => [0.8, 2.5]
            ]
        ];

        $this->createEquipmentWithAttributes($category, $data);
    }

    private function createMistNozzleData($category)
    {
        $data = [
            'product_code' => 'MIST-001',
            'name' => 'หัวพ่นหมอกความดันสูง 10/24',
            'brand' => 'MistCool',
            'image' => '/images/sprinkler/mist-001.jpg',
            'price' => 25.00,
            'attributes' => [
                'name' => 'หัวพ่นหมอกความดันสูง 10/24',
                'size_mm' => 3,
                'size_inch' => 0.1,
                'waterVolumeLitersPerHour' => [8, 15],
                'radiusMeters' => [0.5, 1.2],
                'pressureBar' => [5, 15]
            ]
        ];

        $this->createEquipmentWithAttributes($category, $data);
    }

    private function createImpactSprinklerData($category)
    {
        $data = [
            'product_code' => 'IMP-SPR-001',
            'name' => 'สปริงเกอร์กระแทกโลหะ ขนาด 1" ระยะไกล',
            'brand' => 'Impact Pro',
            'image' => '/images/sprinkler/imp-spr-001.jpg',
            'price' => 450.00,
            'attributes' => [
                'name' => 'สปริงเกอร์กระแทกโลหะ ขนาด 1" ระยะไกล',
                'size_mm' => 25,
                'size_inch' => 1,
                'waterVolumeLitersPerHour' => [500, 2000],
                'radiusMeters' => [12, 25],
                'pressureBar' => [2, 5]
            ]
        ];

        $this->createEquipmentWithAttributes($category, $data);
    }

    private function createGearDriveNozzleData($category)
    {
        $data = [
            'product_code' => 'GD-001',
            'name' => 'หัวฉีดเกียร์ไดร์ฟ ปรับแรงดันและมุม',
            'brand' => 'Gear-Tech',
            'image' => '/images/sprinkler/gd-001.jpg',
            'price' => 320.00,
            'attributes' => [
                'name' => 'หัวฉีดเกียร์ไดร์ฟ ปรับแรงดันและมุม',
                'size_mm' => 20,
                'size_inch' => 0.75,
                'waterVolumeLitersPerHour' => [180, 800],
                'radiusMeters' => [5, 12],
                'pressureBar' => [1.2, 4]
            ]
        ];

        $this->createEquipmentWithAttributes($category, $data);
    }

    private function createDripSprayTapeData($category)
    {
        $data = [
            'product_code' => 'DRIP-TAPE-001',
            'name' => 'เทปน้ำหยด 16mm ระยะรู 30cm ม้วน 500m',
            'brand' => 'Drip-Line',
            'image' => '/images/sprinkler/drip-tape-001.jpg',
            'price' => 850.00,
            'attributes' => [
                'name' => 'เทปน้ำหยด 16mm ระยะรู 30cm ม้วน 500m',
                'size_mm' => 16,
                'size_inch' => 0.63,
                'waterVolumeLitersPerHour' => [1, 4],
                'radiusMeters' => [0.2, 0.5],
                'pressureBar' => [0.5, 1.5]
            ]
        ];

        $this->createEquipmentWithAttributes($category, $data);
    }

    // Helper method สำหรับสร้าง Equipment และ Attributes
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
                'is_active' => true
            ]
        );

        if (isset($data['attributes'])) {
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