import React from 'react';
import { Link } from '@inertiajs/react';

interface UserAvatarProps {
    user: {
        name: string;
        email: string;
        profile_photo_url?: string;
    };
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    onClick?: () => void;
    clickable?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 'md', className = '', onClick, clickable = false }) => {
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
                    className="cursor-pointer hover:opacity-80 transition-opacity"
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
        <div
            className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 ${sizeClasses[size]} ${className}`}
            title={`${user.name} (${user.email})`}
        >
            {initials}
        </div>
    );

    if (clickable && onClick) {
        return (
            <button
                onClick={onClick}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                title="Click to upload profile photo"
            >
                {avatarContent}
            </button>
        );
    }

    return (
        <Link
            href="/profile"
            className="block"
        >
            {avatarContent}
        </Link>
    );
};

export default UserAvatar; 