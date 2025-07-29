import React from 'react';
import { Link } from '@inertiajs/react';

interface UserAvatarProps {
    user: {
        name: string;
        email: string;
        profile_photo_url?: string;
        is_super_user?: boolean;
    };
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    onClick?: () => void;
    clickable?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
    user,
    size = 'md',
    className = '',
    onClick,
    clickable = false,
}) => {
    // Extract initials from user name
    const getInitials = (name: string): string => {
        const names = name.trim().split(' ');
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    };

    const initials = getInitials(user.name);

    // Size classes
    const sizeClasses = {
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-12 h-12 text-lg',
    };

    // If user has a profile photo, show it
    if (user.profile_photo_url) {
        const avatarContent = (
            <img
                src={user.profile_photo_url}
                alt={user.name}
                className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
            />
        );

        if (clickable && onClick) {
            return (
                <button
                    onClick={onClick}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    title="Click to change profile photo"
                >
                    {avatarContent}
                </button>
            );
        }

        return avatarContent;
    }

    // Show initials if no profile photo
    const avatarContent = (
        <div className="relative">
            <div
                className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${sizeClasses[size]} ${className}`}
                title={`${user.name} (${user.email})${user.is_super_user ? ' - Super User' : ''}`}
            >
                {initials}
            </div>
            {user.is_super_user && (
                <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-xs font-bold text-white">
                    👑
                </div>
            )}
        </div>
    );

    if (clickable && onClick) {
        return (
            <button
                onClick={onClick}
                className="cursor-pointer transition-opacity hover:opacity-80"
                title="Click to upload profile photo"
            >
                {avatarContent}
            </button>
        );
    }

    return (
        <Link href="/profile" className="block">
            {avatarContent}
        </Link>
    );
};

export default UserAvatar;
