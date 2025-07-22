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

    // สปริงเกอร์แบบหมุน/ยิงไกล
    private function createSprinklerData($category)
    {
        $data = [
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
        ];

        $this->createEquipmentWithAttributes($category, $data);
    }

    // หัว Pop‑Up ยก–หดได้
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

    // มินิสปริงเกอร์
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

    // หัวฉีดด้านเดียวปรับมุม
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

    // หัวฉีดผีเสื้อ
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

    // หัวพ่นหมอก
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

    // สปริงเกอร์ชนิดกระแทก
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

    // หัวฉีดเกียร์ไดร์ฟ
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

    // เทปน้ำหยดหรือสเปรย์
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
                        'image' => 'https://example.com/foot-valve-1.jpg',
                        'size' => '1"',
                        'specifications' => ['material' => 'PVC', 'working_pressure' => '10 bar'],
                        'price' => 150.00,
                        'is_included' => true,
                        'sort_order' => 1
                    ],
                    [
                        'accessory_type' => 'check_valve',
                        'name' => 'Check Valve 1"',
                        'image' => 'https://example.com/check-valve-1.jpg',
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
                        'image' => 'https://example.com/foot-valve-075.jpg',
                        'size' => '3/4"',
                        'specifications' => ['material' => 'PVC'],
                        'price' => 150.00,
                        'is_included' => true,
                        'sort_order' => 1
                    ],
                    [
                        'accessory_type' => 'check_valve',
                        'name' => 'Check Valve 3/4"',
                        'image' => 'https://example.com/check-valve-075.jpg',
                        'size' => '3/4"',
                        'specifications' => ['material' => 'Brass'],
                        'price' => 300.00,
                        'is_included' => true,
                        'sort_order' => 2
                    ],
                    [
                        'accessory_type' => 'pressure_gauge',
                        'name' => 'Pressure Gauge',
                        'image' => 'https://example.com/pressure-gauge.jpg',
                        'size' => '2"',
                        'specifications' => ['range' => '0-10 bar'],
                        'price' => 100.00,
                        'is_included' => false,
                        'sort_order' => 3
                    ]
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
                ],
                'accessories' => [
                    [
                        'accessory_type' => 'float_switch',
                        'name' => 'สวิตช์ลูกลอยอัตโนมัติ',
                        'image' => 'https://example.com/float-switch.jpg',
                        'size' => null,
                        'specifications' => ['description' => 'ตัดการทำงานเมื่อน้ำแห้ง'],
                        'price' => 0,
                        'is_included' => true,
                        'sort_order' => 1
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
            ]
        ];

        foreach ($pipeData as $data) {
            $this->createEquipmentWithAttributes($category, $data);
        }
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