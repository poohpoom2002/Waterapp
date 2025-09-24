// import { Head, useForm } from '@inertiajs/react';
// import { LoaderCircle, Droplets, Leaf, Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';
// import { FormEventHandler, useState } from 'react';

// import InputError from '@/components/input-error';
// import TextLink from '@/components/text-link';
// import { Button } from '@/components/ui/button';
// import { Checkbox } from '@/components/ui/checkbox';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';

// type LoginForm = {
//     email: string;
//     password: string;
//     remember: boolean;
// };

// interface LoginProps {
//     status?: string;
//     canResetPassword: boolean;
// }

// export default function Login({ status, canResetPassword }: LoginProps) {
//     const [showPassword, setShowPassword] = useState(false);

//     const { data, setData, post, processing, errors, reset } = useForm<Required<LoginForm>>({
//         email: '',
//         password: '',
//         remember: false,
//     });

//     const submit: FormEventHandler = (e) => {
//         e.preventDefault();
//         post(route('login'), {
//             onFinish: () => reset('password'),
//         });
//     };

//     return (
//         <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-green-50 via-blue-50 to-emerald-50 px-4 py-12 sm:px-6 lg:px-8">
//             <Head title="เข้าสู่ระบบ - ระบบจัดการการเกษตร" />

//             {/* Background Decorative Elements */}
//             <div className="pointer-events-none absolute inset-0 overflow-hidden">
//                 <div className="absolute left-10 top-10 h-32 w-32 animate-pulse rounded-full bg-green-200 opacity-20"></div>
//                 <div className="absolute right-20 top-1/4 h-24 w-24 animate-pulse rounded-full bg-blue-200 opacity-20 delay-1000"></div>
//                 <div className="delay-2000 absolute bottom-20 left-1/4 h-40 w-40 animate-pulse rounded-full bg-emerald-200 opacity-20"></div>
//                 <div className="delay-3000 absolute bottom-32 right-32 h-28 w-28 animate-pulse rounded-full bg-cyan-200 opacity-20"></div>

//                 {/* Agricultural Icons Floating */}
//                 <div className="absolute left-1/4 top-1/3 animate-bounce text-green-300 opacity-30">
//                     <Droplets className="h-8 w-8" />
//                 </div>
//                 <div className="absolute right-1/3 top-2/3 animate-bounce text-emerald-300 opacity-30 delay-1000">
//                     <Leaf className="h-10 w-10" />
//                 </div>
//             </div>

//             <div className="relative w-full max-w-md space-y-8">
//                 {/* Header Section */}
//                 <div className="text-center">
//                     {/* Company Logo/Brand */}
//                     <div className="mb-6 flex items-center justify-center">
//                         <div className="relative">
//                             {/* Background glow effect */}
//                             <div className="absolute inset-0 animate-pulse rounded-3xl bg-gradient-to-r from-green-400 to-blue-400 opacity-20 blur-xl"></div>

//                             <div className="relative flex items-center space-x-4 rounded-3xl border border-white/30 bg-white/20 p-4 shadow-2xl backdrop-blur-sm">
//                                 {/* Kanok Logo */}
//                                 <button
//                                     onClick={() =>
//                                         (window.location.href = 'https://www.kanokgroup.com')
//                                     }
//                                     className="cursor-pointer"
//                                 >
//                                     <div className="group relative">
//                                         <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-300 to-emerald-400 opacity-0 blur transition-opacity duration-300 group-hover:opacity-70"></div>
//                                         <img
//                                             src="/images/kanok-chaiyo.png"
//                                             alt="กนก โปรดักส์"
//                                             className="relative h-16 w-16 transform rounded-full border-2 border-white/50 object-cover shadow-lg transition-transform duration-300 group-hover:scale-105"
//                                         />
//                                         {/* Company name tooltip */}
//                                         <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 transform opacity-0 transition-opacity duration-300 group-hover:opacity-100">
//                                             <div className="whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white">
//                                                 กนก โปรดักส์
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </button>

//                                 {/* Connection line/symbol */}
//                                 <div className="flex items-center">
//                                     <div className="h-0.5 w-8 rounded-full bg-gradient-to-r from-green-400 to-blue-400"></div>
//                                     <div className="mx-2 h-3 w-3 animate-ping rounded-full bg-gradient-to-br from-green-400 to-blue-400"></div>
//                                     <div className="h-0.5 w-8 rounded-full bg-gradient-to-r from-blue-400 to-green-400"></div>
//                                 </div>

//                                 {/* Chaiyo Logo */}
//                                 <button
//                                     onClick={() =>
//                                         (window.location.href = 'https://maps.app.goo.gl/HM6LtDJQEDRTRXV17')
//                                     }
//                                     className="cursor-pointer"
//                                 >
//                                     <div className="group relative">
//                                     <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-300 to-cyan-400 opacity-0 blur transition-opacity duration-300 group-hover:opacity-70"></div>
//                                     <img
//                                         src="/images/chaiyo-logo.png"
//                                         alt="ไชโย ไปป์แอนด์ฟิตติ้ง"
//                                         className="relative h-16 w-16 transform rounded-full border-2 border-white/50 object-cover shadow-lg transition-transform duration-300 group-hover:scale-105"
//                                     />
//                                     {/* Company name tooltip */}
//                                     <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 transform opacity-0 transition-opacity duration-300 group-hover:opacity-100">
//                                         <div className="whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white">
//                                             ไชโย ไปป์แอนด์ฟิตติ้ง
//                                         </div>
//                                     </div>
//                                 </div>
//                                 </button>
//                             </div>

//                             {/* Floating decorative elements around logos */}
//                             <div className="absolute -left-2 -top-2 h-4 w-4 animate-bounce rounded-full bg-green-300 opacity-60"></div>
//                             <div className="absolute -right-3 -top-1 h-3 w-3 animate-bounce rounded-full bg-blue-300 opacity-60 delay-500"></div>
//                             <div className="absolute -bottom-2 -left-3 h-3 w-3 animate-bounce rounded-full bg-emerald-300 opacity-60 delay-1000"></div>
//                             <div className="delay-1500 absolute -bottom-1 -right-2 h-4 w-4 animate-bounce rounded-full bg-cyan-300 opacity-60"></div>
//                         </div>
//                     </div>

//                     <h2 className="mb-2 text-3xl font-bold text-gray-900">เข้าสู่ระบบ</h2>
//                     <p className="mb-2 text-lg text-gray-600">ระบบคำนวณอุปกรณ์สำหรับชลประทาน</p>
//                 </div>

//                 {/* Status Message */}
//                 {status && (
//                     <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
//                         <div className="text-center text-sm font-medium text-green-700">
//                             {status}
//                         </div>
//                     </div>
//                 )}

//                 {/* Login Form */}
//                 <div className="relative rounded-2xl border border-white/20 bg-white/80 p-8 shadow-xl backdrop-blur-sm">
//                     {/* Decorative corner elements */}
//                     <div className="absolute right-0 top-0 h-16 w-16 rounded-tr-2xl bg-gradient-to-bl from-green-100 to-transparent"></div>
//                     <div className="absolute bottom-0 left-0 h-16 w-16 rounded-bl-2xl bg-gradient-to-tr from-blue-100 to-transparent"></div>

//                     <div className="space-y-6">
//                         {/* Email Field */}
//                         <div className="space-y-2">
//                             <Label
//                                 htmlFor="email"
//                                 className="flex items-center space-x-2 text-sm font-medium text-gray-700"
//                             >
//                                 <Mail className="h-4 w-4 text-gray-500" />
//                                 <span>อีเมล</span>
//                             </Label>
//                             <div className="relative">
//                                 <Input
//                                     id="email"
//                                     type="email"
//                                     required
//                                     autoFocus
//                                     tabIndex={1}
//                                     autoComplete="email"
//                                     value={data.email}
//                                     onChange={(e) => setData('email', e.target.value)}
//                                     onKeyDown={(e) => e.key === 'Enter' && submit(e)}
//                                     placeholder="example@company.com"
//                                     className="w-full rounded-xl border-gray-200 bg-gray-50 py-3 pl-4 pr-4 text-black transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-green-500"
//                                 />
//                             </div>
//                             <InputError message={errors.email} />
//                         </div>

//                         {/* Password Field */}
//                         <div className="space-y-2">
//                             <div className="flex items-center justify-between">
//                                 <Label
//                                     htmlFor="password"
//                                     className="flex items-center space-x-2 text-sm font-medium text-gray-700"
//                                 >
//                                     <Lock className="h-4 w-4 text-gray-500" />
//                                     <span>รหัสผ่าน</span>
//                                 </Label>
//                                 {canResetPassword && (
//                                     <TextLink
//                                         href={route('password.request')}
//                                         className="text-sm font-medium text-green-600 transition-colors hover:text-green-700"
//                                         tabIndex={5}
//                                     >
//                                         ลืมรหัสผ่าน?
//                                     </TextLink>
//                                 )}
//                             </div>
//                             <div className="relative">
//                                 <Input
//                                     id="password"
//                                     type={showPassword ? 'text' : 'password'}
//                                     required
//                                     tabIndex={2}
//                                     autoComplete="current-password"
//                                     value={data.password}
//                                     onChange={(e) => setData('password', e.target.value)}
//                                     onKeyDown={(e) => e.key === 'Enter' && submit(e)}
//                                     placeholder="รหัสผ่านของคุณ"
//                                     className="w-full rounded-xl border-gray-200 bg-gray-50 py-3 pl-4 pr-12 text-black transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-green-500"
//                                 />
//                                 <button
//                                     type="button"
//                                     className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-gray-600"
//                                     onClick={() => setShowPassword(!showPassword)}
//                                 >
//                                     {showPassword ? (
//                                         <EyeOff className="h-5 w-5" />
//                                     ) : (
//                                         <Eye className="h-5 w-5" />
//                                     )}
//                                 </button>
//                             </div>
//                             <InputError message={errors.password} />
//                         </div>

//                         {/* Remember Me Checkbox */}
//                         <div className="flex items-center space-x-3">
//                             <Checkbox
//                                 id="remember"
//                                 name="remember"
//                                 checked={data.remember}
//                                 onClick={() => setData('remember', !data.remember)}
//                                 tabIndex={3}
//                                 className="data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600"
//                             />
//                             <Label
//                                 htmlFor="remember"
//                                 className="cursor-pointer text-sm text-gray-700"
//                             >
//                                 จดจำการเข้าสู่ระบบ
//                             </Label>
//                         </div>

//                         {/* Submit Button */}
//                         <Button
//                             type="submit"
//                             onClick={submit}
//                             className="w-full transform rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:from-green-700 hover:to-emerald-700 hover:shadow-xl focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
//                             tabIndex={4}
//                             disabled={processing}
//                         >
//                             {processing ? (
//                                 <div className="flex items-center justify-center space-x-2">
//                                     <LoaderCircle className="h-5 w-5 animate-spin" />
//                                     <span>กำลังเข้าสู่ระบบ...</span>
//                                 </div>
//                             ) : (
//                                 <div className="flex items-center justify-center space-x-2">
//                                     <span>เข้าสู่ระบบ</span>
//                                     <Shield className="h-4 w-4" />
//                                 </div>
//                             )}
//                         </Button>
//                     </div>

//                     {/* Register Link - Temporarily disabled */}
//                     {/* <div className="mt-6 text-center">
//                         <p className="text-sm text-gray-600">
//                             ยังไม่มีบัญชี?{' '}
//                             <TextLink
//                                 href={route('register')}
//                                 tabIndex={5}
//                                 className="font-medium text-green-600 transition-colors hover:text-green-700"
//                             >
//                                 สมัครสมาชิก
//                             </TextLink>
//                         </p>
//                     </div> */}
//                 </div>

//                 {/* Footer Info */}
//                 <div className="space-y-2 text-center">
//                     <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
//                         <span className="flex items-center space-x-1">
//                             <Droplets className="h-3 w-3" />
//                             <span>ระบบน้ำการเกษตร</span>
//                         </span>
//                         <span className="flex items-center space-x-1">
//                             <Leaf className="h-3 w-3" />
//                             <span>เทคโนโลยีเกษตร</span>
//                         </span>
//                         <span className="flex items-center space-x-1">
//                             <Shield className="h-3 w-3" />
//                             <span>ปลอดภัย</span>
//                         </span>
//                     </div>
//                     <p className="text-xs text-gray-400">
//                         © 2025 กนก โปรดักส์ × ไชโย ไปป์แอนด์ฟิตติ้ง
//                     </p>
//                 </div>
//             </div>
//         </div>
//     );
// }

import { useForm, usePage } from '@inertiajs/react';
import { LoaderCircle, Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { FormEventHandler, useState, useEffect } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateCsrfTokenFromProps } from '@/bootstrap';

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status }: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);
    const { props } = usePage();

    const { data, setData, post, processing, errors, reset } = useForm<Required<LoginForm>>({
        email: '',
        password: '',
        remember: false,
    });

    // Update CSRF token when component mounts or when props change
    useEffect(() => {
        if (props.csrf_token) {
            updateCsrfTokenFromProps(props.csrf_token as string);
        }
    }, [props.csrf_token]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-green-50 via-blue-50 to-emerald-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="relative w-full max-w-md space-y-8">
                {/* Status Message */}
                {status && (
                    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
                        <div className="text-center text-sm font-medium text-green-700">
                            {status}
                        </div>
                    </div>
                )}
                <div className="mb-4 text-center text-5xl font-bold text-green-700 ">
                    ยินดีต้อนรับเข้าสู่ <br />{' '}
                    <p className="mt-4 text-2xl font-bold text-green-700">
                        บจก. ไชโยไปป์แอนด์ฟิตติ้ง จำกัด
                    </p>
                </div>

                {/* Login Form */}
                <div className="relative rounded-2xl border border-white/20 bg-white/80 p-8 shadow-xl backdrop-blur-sm">
                    {/* Decorative corner elements */}
                    <div className="absolute right-0 top-0 h-16 w-16 rounded-tr-2xl bg-gradient-to-bl from-green-100 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 h-16 w-16 rounded-bl-2xl bg-gradient-to-tr from-blue-100 to-transparent"></div>

                    <div className="space-y-6">
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
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && submit(e)}
                                    placeholder="example@company.com"
                                    className="w-full rounded-xl border-gray-200 bg-gray-50 py-3 pl-4 pr-4 text-black transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <InputError message={errors.email} />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label
                                    htmlFor="password"
                                    className="flex items-center space-x-2 text-sm font-medium text-gray-700"
                                >
                                    <Lock className="h-4 w-4 text-gray-500" />
                                    <span>รหัสผ่าน</span>
                                </Label>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && submit(e)}
                                    placeholder="รหัสผ่านของคุณ"
                                    className="w-full rounded-xl border-gray-200 bg-gray-50 py-3 pl-4 pr-12 text-black transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-green-500"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-gray-600"
                                    onClick={() => setShowPassword(!showPassword)}
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

                        {/* Remember Me Checkbox */}
                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="remember"
                                name="remember"
                                checked={data.remember}
                                onClick={() => setData('remember', !data.remember)}
                                tabIndex={3}
                                className="data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600"
                            />
                            <Label
                                htmlFor="remember"
                                className="cursor-pointer text-sm text-gray-700"
                            >
                                จดจำการเข้าสู่ระบบ
                            </Label>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            onClick={submit}
                            className="w-full transform rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:from-green-700 hover:to-emerald-700 hover:shadow-xl focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                            tabIndex={4}
                            disabled={processing}
                        >
                            {processing ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <LoaderCircle className="h-5 w-5 animate-spin" />
                                    <span>กำลังเข้าสู่ระบบ...</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center space-x-2">
                                    <span>เข้าสู่ระบบ</span>
                                    <Shield className="h-4 w-4" />
                                </div>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
