# Super User Seeder Guide

## ภาพรวม

ไฟล์ `SuperUserSeeder.php` ถูกสร้างขึ้นเพื่อจัดการการสร้าง Super User และ Regular User สำหรับระบบ ChaiyoWaterApp

## ไฟล์ที่ถูกสร้าง/แก้ไข

### 1. `database/seeders/SuperUserSeeder.php` (ไฟล์ใหม่)

- สร้าง Super User หลัก
- สร้าง Super User เพิ่มเติม
- สร้าง Regular User สำหรับทดสอบ
- ตรวจสอบการซ้ำซ้อนของ email

### 2. `database/seeders/DatabaseSeeder.php` (แก้ไข)

- เพิ่ม `use Illuminate\Support\Facades\Hash;`
- เปลี่ยนจากการสร้าง user โดยตรงเป็นการเรียกใช้ `SuperUserSeeder`
- จัดลำดับการทำงานของ seeder

## Accounts ที่จะถูกสร้าง

### Super Users

1. **Admin Kanok**
    - Email: `admin@kanok.com`
    - Password: `kanok-2025`
    - Role: Super User

2. **Super Admin**
    - Email: `superadmin@chaiyo.com`
    - Password: `chaiyo-admin-2025`
    - Role: Super User

### Regular Users (สำหรับทดสอบ)

1. **Test User**
    - Email: `test@example.com`
    - Password: `password123`
    - Role: Regular User

2. **Demo User**
    - Email: `demo@chaiyo.com`
    - Password: `demo123`
    - Role: Regular User

## วิธีการใช้งาน

### 1. รัน Seeder ทั้งหมด

```bash
php artisan db:seed
```

### 2. รัน Super User Seeder เพียงอย่างเดียว

```bash
php artisan db:seed --class=SuperUserSeeder
```

### 3. รีเซ็ตและรัน Seeder ใหม่

```bash
php artisan migrate:fresh --seed
```

## Features ของ SuperUserSeeder

### ป้องกันการซ้ำซ้อน

- ตรวจสอบว่ามี Super User อยู่แล้วหรือไม่
- ตรวจสอบ email ซ้ำก่อนสร้าง user ใหม่

### ข้อความแจ้งเตือน

- แสดงสถานะการสร้าง user แต่ละคน
- แสดง email และรหัสผ่านของ Super User

### ความยืดหยุ่น

- สามารถเพิ่ม user ใหม่ได้ง่าย
- สามารถปรับแต่งข้อมูล user ได้

## การปรับแต่ง

### เพิ่ม Super User ใหม่

แก้ไขอาร์เรย์ `$additionalSuperUsers` ใน `SuperUserSeeder.php`:

```php
$additionalSuperUsers = [
    [
        'name' => 'New Super Admin',
        'email' => 'newsuperadmin@chaiyo.com',
        'password' => Hash::make('your-password'),
        'is_super_user' => true,
        'email_verified_at' => now(),
    ],
    // เพิ่ม user อื่นๆ ตามต้องการ
];
```

### เพิ่ม Regular User ใหม่

แก้ไขอาร์เรย์ `$regularUsers` ใน `SuperUserSeeder.php`:

```php
$regularUsers = [
    [
        'name' => 'New Test User',
        'email' => 'newtest@example.com',
        'password' => Hash::make('password123'),
        'is_super_user' => false,
        'email_verified_at' => now(),
    ],
    // เพิ่ม user อื่นๆ ตามต้องการ
];
```

## ความปลอดภัย

### การจัดการรหัสผ่าน

- ใช้ `Hash::make()` สำหรับการเข้ารหัสรหัสผ่าน
- รหัสผ่านถูกเก็บไว้ใน code ชั่วคราวเพื่อการ development
- **ควรเปลี่ยนรหัสผ่านทันทีหลังจาก deploy production**

### การตรวจสอบสิทธิ์

- Super User มีสิทธิ์เข้าถึงฟังก์ชัน SuperUserController
- Regular User มีสิทธิ์เข้าถึงเฉพาะฟังก์ชันพื้นฐาน

## หมายเหตุ

1. **Production Environment**: ควรเปลี่ยนรหัสผ่านเริ่มต้นก่อน deploy
2. **Database Migration**: ตรวจสอบว่า migration `add_super_user_to_users_table` ทำงานแล้ว
3. **Testing**: ใช้ Regular User accounts สำหรับการทดสอบ
4. **Backup**: สำรองข้อมูลก่อนรัน migrate:fresh

## การแก้ไขปัญหา

### ถ้า Super User มีอยู่แล้ว

Seeder จะไม่สร้าง Super User ซ้ำ และจะแสดงข้อความแจ้งเตือน

### ถ้า Email ซ้ำ

Seeder จะข้าม user ที่มี email ซ้ำ และแสดงข้อความแจ้งเตือน

### ถ้าเกิด Error

ตรวจสอบ:

1. Database connection
2. Migration ทำงานครบถ้วน
3. Model `User` มี field `is_super_user`
