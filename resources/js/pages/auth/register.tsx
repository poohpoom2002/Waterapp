import { Head, useForm } from '@inertiajs/react';
import {
    LoaderCircle,
    Droplets,
    Leaf,
    Shield,
    Mail,
    Lock,
    Eye,
    EyeOff,
    User,
    UserPlus,
} from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type RegisterForm = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
};

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm<Required<RegisterForm>>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-green-50 via-blue-50 to-emerald-50 px-4 py-12 sm:px-6 lg:px-8">
            <Head title="สมัครสมาชิก - ระบบจัดการการเกษตร" />

            {/* Background Decorative Elements */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute left-16 top-16 h-28 w-28 animate-pulse rounded-full bg-green-200 opacity-20"></div>
                <div className="absolute right-16 top-1/3 h-20 w-20 animate-pulse rounded-full bg-blue-200 opacity-20 delay-1000"></div>
                <div className="delay-2000 absolute bottom-24 left-1/3 h-36 w-36 animate-pulse rounded-full bg-emerald-200 opacity-20"></div>
                <div className="delay-3000 absolute bottom-40 right-1/4 h-24 w-24 animate-pulse rounded-full bg-cyan-200 opacity-20"></div>
                <div className="delay-4000 absolute left-8 top-1/2 h-32 w-32 animate-pulse rounded-full bg-teal-200 opacity-15"></div>

                {/* Agricultural Icons Floating */}
                <div className="left-1/5 absolute top-1/4 animate-bounce text-green-300 opacity-30">
                    <Droplets className="h-7 w-7" />
                </div>
                <div className="absolute right-1/4 top-3/4 animate-bounce text-emerald-300 opacity-30 delay-1000">
                    <Leaf className="h-9 w-9" />
                </div>
                <div className="delay-2000 absolute right-12 top-1/2 animate-bounce text-blue-300 opacity-25">
                    <Shield className="h-6 w-6" />
                </div>
            </div>

            <div className="relative w-full max-w-lg space-y-8">
                {/* Header Section */}
                <div className="text-center">
                    {/* Company Logo/Brand */}
                    <div className="mb-6 flex items-center justify-center">
                        <div className="relative">
                            {/* Background glow effect */}
                            <div className="absolute inset-0 animate-pulse rounded-3xl bg-gradient-to-r from-green-400 to-blue-400 opacity-20 blur-xl"></div>

                            <div className="relative flex items-center space-x-4 rounded-3xl border border-white/30 bg-white/20 p-4 shadow-2xl backdrop-blur-sm">
                                {/* Kanok Logo */}
                                <div className="group relative">
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-300 to-emerald-400 opacity-0 blur transition-opacity duration-300 group-hover:opacity-70"></div>
                                    <img
                                        src="/images/kanok-chaiyo.png"
                                        alt="กนก โปรดักส์"
                                        className="relative h-16 w-16 transform rounded-full border-2 border-white/50 object-cover shadow-lg transition-transform duration-300 group-hover:scale-105"
                                    />
                                    {/* Company name tooltip */}
                                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 transform opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                        <div className="whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white">
                                            กนก โปรดักส์
                                        </div>
                                    </div>
                                </div>

                                {/* Connection line/symbol */}
                                <div className="flex items-center">
                                    <div className="h-0.5 w-8 rounded-full bg-gradient-to-r from-green-400 to-blue-400"></div>
                                    <div className="mx-2 h-3 w-3 animate-ping rounded-full bg-gradient-to-br from-green-400 to-blue-400"></div>
                                    <div className="h-0.5 w-8 rounded-full bg-gradient-to-r from-blue-400 to-green-400"></div>
                                </div>

                                {/* Chaiyo Logo */}
                                <div className="group relative">
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-300 to-cyan-400 opacity-0 blur transition-opacity duration-300 group-hover:opacity-70"></div>
                                    <img
                                        src="/images/chaiyo-logo.png"
                                        alt="ไชโย ไปป์แอนด์ฟิตติ้ง"
                                        className="relative h-16 w-16 transform rounded-full border-2 border-white/50 object-cover shadow-lg transition-transform duration-300 group-hover:scale-105"
                                    />
                                    {/* Company name tooltip */}
                                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 transform opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                        <div className="whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white">
                                            ไชโย ไปป์แอนด์ฟิตติ้ง
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating decorative elements around logos */}
                            <div className="absolute -left-2 -top-2 h-4 w-4 animate-bounce rounded-full bg-green-300 opacity-60"></div>
                            <div className="absolute -right-3 -top-1 h-3 w-3 animate-bounce rounded-full bg-blue-300 opacity-60 delay-500"></div>
                            <div className="absolute -bottom-2 -left-3 h-3 w-3 animate-bounce rounded-full bg-emerald-300 opacity-60 delay-1000"></div>
                            <div className="delay-1500 absolute -bottom-1 -right-2 h-4 w-4 animate-bounce rounded-full bg-cyan-300 opacity-60"></div>
                        </div>
                    </div>

                    <h2 className="mb-2 text-3xl font-bold text-gray-900">สมัครสมาชิก</h2>
                    <p className="mb-2 text-lg text-gray-600">ระบบคำนวณอุปกรณ์สำหรับชลประทาน</p>
                </div>

                {/* Register Form */}
                <div className="relative rounded-2xl border border-white/20 bg-white/80 p-8 shadow-xl backdrop-blur-sm">
                    {/* Decorative corner elements */}
                    <div className="absolute right-0 top-0 h-20 w-20 rounded-tr-2xl bg-gradient-to-bl from-green-100 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 h-20 w-20 rounded-bl-2xl bg-gradient-to-tr from-blue-100 to-transparent"></div>

                    <div className="space-y-6">
                        {/* Name Field */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="name"
                                className="flex items-center space-x-2 text-sm font-medium text-gray-700"
                            >
                                <User className="h-4 w-4 text-gray-500" />
                                <span>ชื่อ-นามสกุล</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && submit(e)}
                                    disabled={processing}
                                    placeholder="กรอกชื่อ-นามสกุลของคุณ"
                                    className="w-full rounded-xl border-gray-200 bg-gray-50 py-3 pl-4 pr-4 transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <InputError message={errors.name} />
                        </div>

                        {/* Email Field */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="email"
                                className="flex items-center space-x-2 text-sm font-medium text-gray-700"
                            >
                                <Mail className="h-4 w-4 text-gray-500" />
                                <span>อีเมล</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    tabIndex={2}
                                    autoComplete="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && submit(e)}
                                    disabled={processing}
                                    placeholder="example@company.com"
                                    className="w-full rounded-xl border-gray-200 bg-gray-50 py-3 pl-4 pr-4 transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <InputError message={errors.email} />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="password"
                                className="flex items-center space-x-2 text-sm font-medium text-gray-700"
                            >
                                <Lock className="h-4 w-4 text-gray-500" />
                                <span>รหัสผ่าน</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    tabIndex={3}
                                    autoComplete="new-password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && submit(e)}
                                    disabled={processing}
                                    placeholder="สร้างรหัสผ่านที่แข็งแรง"
                                    className="w-full rounded-xl border-gray-200 bg-gray-50 py-3 pl-4 pr-12 transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-green-500"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-gray-600"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={processing}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                            <InputError message={errors.password} />
                        </div>

                        {/* Password Confirmation Field */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="password_confirmation"
                                className="flex items-center space-x-2 text-sm font-medium text-gray-700"
                            >
                                <Lock className="h-4 w-4 text-gray-500" />
                                <span>ยืนยันรหัสผ่าน</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password_confirmation"
                                    type={showPasswordConfirmation ? 'text' : 'password'}
                                    required
                                    tabIndex={4}
                                    autoComplete="new-password"
                                    value={data.password_confirmation}
                                    onChange={(e) =>
                                        setData('password_confirmation', e.target.value)
                                    }
                                    onKeyDown={(e) => e.key === 'Enter' && submit(e)}
                                    disabled={processing}
                                    placeholder="กรอกรหัสผ่านอีกครั้งเพื่อยืนยัน"
                                    className="w-full rounded-xl border-gray-200 bg-gray-50 py-3 pl-4 pr-12 transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-green-500"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-gray-600"
                                    onClick={() =>
                                        setShowPasswordConfirmation(!showPasswordConfirmation)
                                    }
                                    disabled={processing}
                                >
                                    {showPasswordConfirmation ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                            <InputError message={errors.password_confirmation} />
                        </div>

                        {/* Password Strength Indicator */}
                        <div className="rounded-lg bg-gray-50 p-3">
                            <p className="mb-2 text-xs text-gray-600">รหัสผ่านควรมี:</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                                <span
                                    className={`rounded-full px-2 py-1 ${data.password.length >= 8 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                                >
                                    อย่างน้อย 8 ตัวอักษร
                                </span>
                                <span
                                    className={`rounded-full px-2 py-1 ${/[A-Z]/.test(data.password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                                >
                                    ตัวอักษรใหญ่
                                </span>
                                <span
                                    className={`rounded-full px-2 py-1 ${/[0-9]/.test(data.password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                                >
                                    ตัวเลข
                                </span>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            onClick={submit}
                            className="w-full transform rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:from-green-700 hover:to-emerald-700 hover:shadow-xl focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                            tabIndex={5}
                            disabled={processing}
                        >
                            {processing ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <LoaderCircle className="h-5 w-5 animate-spin" />
                                    <span>กำลังสร้างบัญชี...</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center space-x-2">
                                    <span>สร้างบัญชีผู้ใช้</span>
                                    <UserPlus className="h-4 w-4" />
                                </div>
                            )}
                        </Button>
                    </div>

                    {/* Login Link */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            มีบัญชีอยู่แล้ว?{' '}
                            <TextLink
                                href={route('login')}
                                tabIndex={6}
                                className="font-medium text-green-600 transition-colors hover:text-green-700"
                            >
                                เข้าสู่ระบบ
                            </TextLink>
                        </p>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="space-y-2 text-center">
                    <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                            <Droplets className="h-3 w-3" />
                            <span>ระบบน้ำการเกษตร</span>
                        </span>
                        <span className="flex items-center space-x-1">
                            <Leaf className="h-3 w-3" />
                            <span>เทคโนโลยีเกษตร</span>
                        </span>
                        <span className="flex items-center space-x-1">
                            <Shield className="h-3 w-3" />
                            <span>ปลอดภัย</span>
                        </span>
                    </div>
                    <p className="text-xs text-gray-400">
                        © 2025 กนก โปรดักส์ × ไชโย ไปป์แอนด์ฟิตติ้ง
                    </p>
                </div>
            </div>
        </div>
    );
}
