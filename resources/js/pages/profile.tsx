import React, { useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { useLanguage } from '../contexts/LanguageContext';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import UserAvatar from '../components/UserAvatar';
import ProfilePhotoModal from '../components/ProfilePhotoModal';

interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    created_at?: string;
    profile_photo_url?: string;
    is_super_user?: boolean;
}

interface ProfileProps {
    auth: {
        user: User;
    };
    [key: string]: any;
}

export default function Profile() {
    const { t } = useLanguage();
    
    // Defensive usePage call with error handling
    let auth;
    try {
        auth = usePage<ProfileProps>().props.auth;
    } catch (error) {
        console.warn('Inertia context not available in Profile, using fallback values');
        auth = { user: null };
    }
    
    const user = auth.user;

    const [isEditing, setIsEditing] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);

    const { data, setData, patch, processing, errors } = useForm({
        name: user.name,
        email: user.email,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Form submitted - isEditing:', isEditing);
        if (!isEditing) {
            console.log('Form submitted while not editing - preventing submission');
            return;
        }
        patch(route('profile.update'), {
            onSuccess: () => {
                setIsEditing(false);
            },
        });
    };

    const handleLogout = () => {
        router.post('/logout');
    };

    const handlePhotoUploaded = (photoUrl: string) => {
        // Update the user object with the new photo URL
        user.profile_photo_url = photoUrl;
        // Force a re-render by updating the page props
        router.reload();
    };

    return (
        <div className="min-h-screen bg-gray-900">
            <Head title="Profile" />
            <Navbar />

            <div className="p-6">
                <div className="mx-auto max-w-4xl">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-white">👤 User Profile</h1>
                                <p className="mt-2 text-gray-400">
                                    Manage your account information
                                </p>
                            </div>
                            <button
                                onClick={() => router.visit('/')}
                                className="rounded-lg bg-gray-700 px-4 py-2 text-white transition-colors hover:bg-gray-600"
                            >
                                ← Back to Home
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                        {/* Profile Card */}
                        <div className="lg:col-span-2">
                            <div className="rounded-lg bg-gray-800 p-6">
                                <div className="mb-6 flex items-center gap-4">
                                    <UserAvatar
                                        user={user}
                                        size="lg"
                                        clickable={true}
                                        onClick={() => setShowPhotoModal(true)}
                                    />
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">
                                            {user.name}
                                        </h2>
                                        <p className="text-gray-400">{user.email}</p>
                                        <div className="flex gap-2">
                                            {user.email_verified_at && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-green-900/30 px-2 py-1 text-xs text-green-400">
                                                    ✓ Verified Email
                                                </span>
                                            )}
                                            {user.is_super_user && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-900/30 px-2 py-1 text-xs text-yellow-400">
                                                    👑 Super User
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                                    <div>
                                        <label
                                            htmlFor="name"
                                            className="block text-sm font-medium text-gray-300"
                                        >
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            disabled={!isEditing}
                                            className={`mt-1 block w-full rounded-md border px-3 py-2 text-white ${
                                                isEditing
                                                    ? 'border-gray-600 bg-gray-700 focus:border-blue-500 focus:ring-blue-500'
                                                    : 'border-gray-700 bg-gray-900 text-gray-400'
                                            }`}
                                        />
                                        {errors.name && (
                                            <p className="mt-1 text-sm text-red-400">
                                                {errors.name}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="email"
                                            className="block text-sm font-medium text-gray-300"
                                        >
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            disabled={!isEditing}
                                            className={`mt-1 block w-full rounded-md border px-3 py-2 text-white ${
                                                isEditing
                                                    ? 'border-gray-600 bg-gray-700 focus:border-blue-500 focus:ring-blue-500'
                                                    : 'border-gray-700 bg-gray-900 text-gray-400'
                                            }`}
                                        />
                                        {errors.email && (
                                            <p className="mt-1 text-sm text-red-400">
                                                {errors.email}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-4">
                                        {isEditing ? (
                                            <>
                                                <button
                                                    type="submit"
                                                    disabled={processing}
                                                    className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {processing ? 'Saving...' : 'Save Changes'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsEditing(false);
                                                        setData({
                                                            name: user.name,
                                                            email: user.email,
                                                        });
                                                    }}
                                                    className="rounded-lg bg-gray-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-gray-700"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    console.log('Edit Profile clicked');
                                                    setIsEditing(true);
                                                }}
                                                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
                                            >
                                                Edit Profile
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Account Stats */}
                            <div className="rounded-lg bg-gray-800 p-6">
                                <h3 className="mb-4 text-lg font-semibold text-white">
                                    📊 Account Statistics
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Member since:</span>
                                        <span className="text-white">
                                            {new Date(
                                                user.created_at || Date.now()
                                            ).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Email status:</span>
                                        <span
                                            className={
                                                user.email_verified_at
                                                    ? 'text-green-400'
                                                    : 'text-yellow-400'
                                            }
                                        >
                                            {user.email_verified_at ? 'Verified' : 'Unverified'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Account Security */}
                            <div className="rounded-lg bg-gray-800 p-6">
                                <h3 className="mb-4 text-lg font-semibold text-white">
                                    🔒 Account Security
                                </h3>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => router.visit('/forgot-password')}
                                        className="w-full rounded-lg bg-yellow-600 px-4 py-2 text-left font-semibold text-white transition-colors hover:bg-yellow-700"
                                    >
                                        🔑 Change Password
                                    </button>
                                    {!user.email_verified_at && (
                                        <button
                                            onClick={() => router.visit('/verify-email')}
                                            className="w-full rounded-lg bg-purple-600 px-4 py-2 text-left font-semibold text-white transition-colors hover:bg-purple-700"
                                        >
                                            ✉️ Verify Email
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowLogoutConfirm(true)}
                                        className="w-full rounded-lg bg-red-600 px-4 py-2 text-left font-semibold text-white transition-colors hover:bg-red-700"
                                    >
                                        🚪 Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <Footer />

            {/* Profile Photo Modal */}
            <ProfilePhotoModal
                isOpen={showPhotoModal}
                onClose={() => setShowPhotoModal(false)}
                onPhotoUploaded={handlePhotoUploaded}
                currentPhotoUrl={user.profile_photo_url}
            />

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
                    <div className="relative z-[10000] mx-4 w-full max-w-md rounded-lg bg-gray-800 p-6">
                        <div className="mb-4 flex items-center">
                            <div className="flex-shrink-0">
                                <svg
                                    className="h-6 w-6 text-red-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                    />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-lg font-medium text-white">Confirm Logout</h3>
                            </div>
                        </div>
                        <div className="mb-6">
                            <p className="text-gray-300">
                                Are you sure you want to logout? You will need to login again to
                                access your account.
                            </p>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="rounded px-4 py-2 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
