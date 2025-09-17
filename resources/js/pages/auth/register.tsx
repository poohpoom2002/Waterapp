import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, Droplets, Leaf, Shield, Mail, Lock, Eye, EyeOff, User, UserPlus } from 'lucide-react';
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
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-emerald-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            <Head title="สมัครสมาชิก - ระบบจัดการการเกษตร" />
            
            {/* Background Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-16 left-16 w-28 h-28 bg-green-200 rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute top-1/3 right-16 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
                <div className="absolute bottom-24 left-1/3 w-36 h-36 bg-emerald-200 rounded-full opacity-20 animate-pulse delay-2000"></div>
                <div className="absolute bottom-40 right-1/4 w-24 h-24 bg-cyan-200 rounded-full opacity-20 animate-pulse delay-3000"></div>
                <div className="absolute top-1/2 left-8 w-32 h-32 bg-teal-200 rounded-full opacity-15 animate-pulse delay-4000"></div>
                
                {/* Agricultural Icons Floating */}
                <div className="absolute top-1/4 left-1/5 text-green-300 opacity-30 animate-bounce">
                    <Droplets className="w-7 h-7" />
                </div>
                <div className="absolute top-3/4 right-1/4 text-emerald-300 opacity-30 animate-bounce delay-1000">
                    <Leaf className="w-9 h-9" />
                </div>
                <div className="absolute top-1/2 right-12 text-blue-300 opacity-25 animate-bounce delay-2000">
                    <Shield className="w-6 h-6" />
                </div>
            </div>

            <div className="max-w-lg w-full space-y-8 relative">
                {/* Header Section */}
                <div className="text-center">
                    {/* Company Logo/Brand */}
                    <div className="flex justify-center items-center mb-6">
                        <div className="relative">
                            {/* Background glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 rounded-3xl blur-xl opacity-20 animate-pulse"></div>
                            
                            <div className="relative flex items-center space-x-4 bg-white/20 backdrop-blur-sm rounded-3xl p-4 border border-white/30 shadow-2xl">
                                {/* Kanok Logo */}
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-green-300 to-emerald-400 rounded-2xl blur opacity-0 group-hover:opacity-70 transition-opacity duration-300"></div>
                                    <img 
                                        src="/images/kanok-chaiyo.png" 
                                        alt="กนก โปรดักส์" 
                                        className="relative h-16 w-16 rounded-full shadow-lg border-2 border-white/50 transform group-hover:scale-105 transition-transform duration-300 object-cover"
                                    />
                                    {/* Company name tooltip */}
                                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                            กนก โปรดักส์
                                        </div>
                                    </div>
                                </div>

                                {/* Connection line/symbol */}
                                <div className="flex items-center">
                                    <div className="w-8 h-0.5 bg-gradient-to-r from-green-400 to-blue-400 rounded-full"></div>
                                    <div className="mx-2 w-3 h-3 bg-gradient-to-br from-green-400 to-blue-400 rounded-full animate-ping"></div>
                                    <div className="w-8 h-0.5 bg-gradient-to-r from-blue-400 to-green-400 rounded-full"></div>
                                </div>

                                {/* Chaiyo Logo */}
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-300 to-cyan-400 rounded-2xl blur opacity-0 group-hover:opacity-70 transition-opacity duration-300"></div>
                                    <img 
                                        src="/images/chaiyo-logo.png" 
                                        alt="ไชโย ไปป์แอนด์ฟิตติ้ง" 
                                        className="relative h-16 w-16 rounded-full shadow-lg border-2 border-white/50 transform group-hover:scale-105 transition-transform duration-300 object-cover"
                                    />
                                    {/* Company name tooltip */}
                                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                            ไชโย ไปป์แอนด์ฟิตติ้ง
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating decorative elements around logos */}
                            <div className="absolute -top-2 -left-2 w-4 h-4 bg-green-300 rounded-full opacity-60 animate-bounce"></div>
                            <div className="absolute -top-1 -right-3 w-3 h-3 bg-blue-300 rounded-full opacity-60 animate-bounce delay-500"></div>
                            <div className="absolute -bottom-2 -left-3 w-3 h-3 bg-emerald-300 rounded-full opacity-60 animate-bounce delay-1000"></div>
                            <div className="absolute -bottom-1 -right-2 w-4 h-4 bg-cyan-300 rounded-full opacity-60 animate-bounce delay-1500"></div>
                        </div>
                    </div>
                    
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        สมัครสมาชิก
                    </h2>
                    <p className="text-lg text-gray-600 mb-2">
                        ระบบคำนวณอุปกรณ์สำหรับชลประทาน
                    </p>
                </div>

                {/* Register Form */}
                <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-white/20 relative">
                    {/* Decorative corner elements */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-green-100 to-transparent rounded-tr-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-blue-100 to-transparent rounded-bl-2xl"></div>
                    
                    <div className="space-y-6">
                        {/* Name Field */}
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                <User className="w-4 h-4 text-gray-500" />
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
                                    className="pl-4 pr-4 py-3 w-full border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                            </div>
                            <InputError message={errors.name} />
                        </div>

                        {/* Email Field */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                <Mail className="w-4 h-4 text-gray-500" />
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
                                    className="pl-4 pr-4 py-3 w-full border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                            </div>
                            <InputError message={errors.email} />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                <Lock className="w-4 h-4 text-gray-500" />
                                <span>รหัสผ่าน</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    tabIndex={3}
                                    autoComplete="new-password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && submit(e)}
                                    disabled={processing}
                                    placeholder="สร้างรหัสผ่านที่แข็งแรง"
                                    className="pl-4 pr-12 py-3 w-full border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
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
                            <Label htmlFor="password_confirmation" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                <Lock className="w-4 h-4 text-gray-500" />
                                <span>ยืนยันรหัสผ่าน</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password_confirmation"
                                    type={showPasswordConfirmation ? "text" : "password"}
                                    required
                                    tabIndex={4}
                                    autoComplete="new-password"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && submit(e)}
                                    disabled={processing}
                                    placeholder="กรอกรหัสผ่านอีกครั้งเพื่อยืนยัน"
                                    className="pl-4 pr-12 py-3 w-full border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                    onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
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
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-600 mb-2">รหัสผ่านควรมี:</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                                <span className={`px-2 py-1 rounded-full ${data.password.length >= 8 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    อย่างน้อย 8 ตัวอักษร
                                </span>
                                <span className={`px-2 py-1 rounded-full ${/[A-Z]/.test(data.password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    ตัวอักษรใหญ่
                                </span>
                                <span className={`px-2 py-1 rounded-full ${/[0-9]/.test(data.password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    ตัวเลข
                                </span>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            onClick={submit}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-lg hover:shadow-xl"
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
                                className="font-medium text-green-600 hover:text-green-700 transition-colors"
                            >
                                เข้าสู่ระบบ
                            </TextLink>
                        </p>
                    </div>

                </div>

                {/* Footer Info */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                            <Droplets className="w-3 h-3" />
                            <span>ระบบน้ำการเกษตร</span>
                        </span>
                        <span className="flex items-center space-x-1">
                            <Leaf className="w-3 h-3" />
                            <span>เทคโนโลยีเกษตร</span>
                        </span>  
                        <span className="flex items-center space-x-1">
                            <Shield className="w-3 h-3" />
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