import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import {
    FaUsers,
    FaFolder,
    FaMap,
    FaPlus,
    FaEdit,
    FaTrash,
    FaEye,
    FaChartBar,
} from 'react-icons/fa';

// Types
type User = {
    id: number;
    name: string;
    email: string;
    is_super_user: boolean;
    created_at: string;
    fields_count?: number;
    folders_count?: number;
};

type Field = {
    id: string;
    name: string;
    user: User;
    totalArea: number;
    totalPlants: number;
    status: string;
    isCompleted: boolean;
    created_at: string;
};

type Folder = {
    id: string;
    name: string;
    type: string;
    user: User;
    color?: string;
    icon?: string;
    created_at: string;
};

type DashboardStats = {
    total_users: number;
    total_fields: number;
    total_folders: number;
    recent_users: User[];
    recent_fields: Field[];
    recent_folders: Folder[];
};

export default function SuperUserDashboard() {
    const { t } = useLanguage();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [fields, setFields] = useState<Field[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'fields' | 'folders'>(
        'dashboard'
    );
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [showEditUserModal, setShowEditUserModal] = useState(false);
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [statsResponse, usersResponse, fieldsResponse, foldersResponse] =
                await Promise.all([
                    axios.get('/super/dashboard'),
                    axios.get('/super/users'),
                    axios.get('/super/fields'),
                    axios.get('/super/folders'),
                ]);

            if (statsResponse.data.success) {
                setStats(statsResponse.data.stats);
            }
            if (usersResponse.data.success) {
                setUsers(usersResponse.data.users);
            }
            if (fieldsResponse.data.success) {
                setFields(fieldsResponse.data.fields);
            }
            if (foldersResponse.data.success) {
                setFolders(foldersResponse.data.folders);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (
        userData: Omit<User, 'id' | 'created_at'> & { password: string }
    ) => {
        try {
            const response = await axios.post('/super/users', userData);
            if (response.data.success) {
                setUsers((prev) => [...prev, response.data.user]);
                setShowCreateUserModal(false);
            }
        } catch (error) {
            console.error('Error creating user:', error);
            alert('Error creating user');
        }
    };

    const handleUpdateUser = async (userId: number, userData: Partial<User>) => {
        try {
            const response = await axios.put(`/super/users/${userId}`, userData);
            if (response.data.success) {
                setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...userData } : u)));
                setShowEditUserModal(false);
                setSelectedUser(null);
            }
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Error updating user');
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (
            !confirm(
                'Are you sure you want to delete this user? This will also delete all their fields and folders.'
            )
        ) {
            return;
        }

        try {
            const response = await axios.delete(`/super/users/${userId}`);
            if (response.data.success) {
                setUsers((prev) => prev.filter((u) => u.id !== userId));
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error deleting user');
        }
    };

    const handleDeleteField = async (fieldId: string) => {
        if (!confirm('Are you sure you want to delete this field?')) {
            return;
        }

        try {
            const response = await axios.delete(`/super/fields/${fieldId}`);
            if (response.data.success) {
                setFields((prev) => prev.filter((f) => f.id !== fieldId));
            }
        } catch (error) {
            console.error('Error deleting field:', error);
            alert('Error deleting field');
        }
    };

    const handleDeleteFolder = async (folderId: string) => {
        if (!confirm('Are you sure you want to delete this folder?')) {
            return;
        }

        try {
            const response = await axios.delete(`/super/folders/${folderId}`);
            if (response.data.success) {
                setFolders((prev) => prev.filter((f) => f.id !== folderId));
            }
        } catch (error) {
            console.error('Error deleting folder:', error);
            alert('Error deleting folder');
        }
    };

    const handleCreateFolder = async (
        folderData: Omit<Folder, 'id' | 'created_at' | 'user'> & { user_id: number }
    ) => {
        try {
            const response = await axios.post('/super/folders', folderData);
            if (response.data.success) {
                // Reload folders to get the new folder with user data
                const foldersResponse = await axios.get('/super/folders');
                if (foldersResponse.data.success) {
                    setFolders(foldersResponse.data.folders);
                }
                setShowCreateFolderModal(false);
            }
        } catch (error) {
            console.error('Error creating folder:', error);
            alert('Error creating folder');
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-900">
                <div className="text-xl text-white">{t('loading')}</div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-gray-900">
            <Navbar />
            <div className="flex-1">
                <div className="p-6">
                    <div className="mx-auto max-w-7xl">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-white">
                                {t('super_user_dashboard')}
                            </h1>
                            <p className="mt-2 text-gray-400">{t('manage_all_users_and_data')}</p>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="mb-6">
                            <nav className="flex space-x-8">
                                {[
                                    { id: 'dashboard', label: t('dashboard'), icon: FaChartBar },
                                    { id: 'users', label: t('users'), icon: FaUsers },
                                    { id: 'fields', label: t('fields'), icon: FaMap },
                                    { id: 'folders', label: t('folders'), icon: FaFolder },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                                            activeTab === tab.id
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                                        }`}
                                    >
                                        <tab.icon className="h-4 w-4" />
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Content */}
                        {activeTab === 'dashboard' && stats && (
                            <div className="space-y-6">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                    <div className="rounded-lg bg-blue-600 p-6 text-white">
                                        <div className="flex items-center">
                                            <FaUsers className="h-8 w-8" />
                                            <div className="ml-4">
                                                <p className="text-sm opacity-90">
                                                    {t('total_users')}
                                                </p>
                                                <p className="text-2xl font-bold">
                                                    {stats.total_users}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-green-600 p-6 text-white">
                                        <div className="flex items-center">
                                            <FaMap className="h-8 w-8" />
                                            <div className="ml-4">
                                                <p className="text-sm opacity-90">
                                                    {t('total_fields')}
                                                </p>
                                                <p className="text-2xl font-bold">
                                                    {stats.total_fields}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-purple-600 p-6 text-white">
                                        <div className="flex items-center">
                                            <FaFolder className="h-8 w-8" />
                                            <div className="ml-4">
                                                <p className="text-sm opacity-90">
                                                    {t('total_folders')}
                                                </p>
                                                <p className="text-2xl font-bold">
                                                    {stats.total_folders}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Activity */}
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                    <div className="rounded-lg bg-gray-800 p-6">
                                        <h3 className="mb-4 text-lg font-semibold text-white">
                                            {t('recent_users')}
                                        </h3>
                                        <div className="space-y-3">
                                            {stats.recent_users.map((user) => (
                                                <div
                                                    key={user.id}
                                                    className="flex items-center justify-between"
                                                >
                                                    <div>
                                                        <p className="text-white">{user.name}</p>
                                                        <p className="text-sm text-gray-400">
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                    {user.is_super_user && (
                                                        <span className="rounded bg-yellow-600 px-2 py-1 text-xs text-white">
                                                            {t('super_user')}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-gray-800 p-6">
                                        <h3 className="mb-4 text-lg font-semibold text-white">
                                            {t('recent_fields')}
                                        </h3>
                                        <div className="space-y-3">
                                            {stats.recent_fields.map((field) => (
                                                <div
                                                    key={field.id}
                                                    className="flex items-center justify-between"
                                                >
                                                    <div>
                                                        <p className="text-white">{field.name}</p>
                                                        <p className="text-sm text-gray-400">
                                                            {field.user.name}
                                                        </p>
                                                    </div>
                                                    <span className="text-sm text-gray-400">
                                                        {field.totalArea?.toFixed(2)} ไร่
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-gray-800 p-6">
                                        <h3 className="mb-4 text-lg font-semibold text-white">
                                            {t('recent_folders')}
                                        </h3>
                                        <div className="space-y-3">
                                            {stats.recent_folders.map((folder) => (
                                                <div
                                                    key={folder.id}
                                                    className="flex items-center justify-between"
                                                >
                                                    <div>
                                                        <p className="text-white">{folder.name}</p>
                                                        <p className="text-sm text-gray-400">
                                                            {folder.user.name}
                                                        </p>
                                                    </div>
                                                    <span className="text-sm text-gray-400">
                                                        {folder.type}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div>
                                <div className="mb-6 flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-white">
                                        {t('user_management')}
                                    </h2>
                                    <button
                                        onClick={() => setShowCreateUserModal(true)}
                                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                                    >
                                        <FaPlus className="h-4 w-4" />
                                        {t('create_user')}
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {users.map((user) => (
                                        <div
                                            key={user.id}
                                            className="rounded-lg border border-gray-700 bg-gray-800 p-6"
                                        >
                                            <div className="mb-4 flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-white">
                                                        {user.name}
                                                    </h3>
                                                    <p className="text-sm text-gray-400">
                                                        {user.email}
                                                    </p>
                                                </div>
                                                {user.is_super_user && (
                                                    <span className="rounded bg-yellow-600 px-2 py-1 text-xs text-white">
                                                        {t('super_user')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowEditUserModal(true);
                                                    }}
                                                    className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                                                >
                                                    <FaEdit className="mr-1 h-3 w-3" />
                                                    {t('edit')}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="flex-1 rounded bg-red-600 px-3 py-2 text-sm text-white transition-colors hover:bg-red-700"
                                                >
                                                    <FaTrash className="mr-1 h-3 w-3" />
                                                    {t('delete')}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'fields' && (
                            <div>
                                <div className="mb-6">
                                    <h2 className="text-xl font-semibold text-white">
                                        {t('field_management')}
                                    </h2>
                                </div>

                                {/* Group fields by user */}
                                {(() => {
                                    const fieldsByUser = fields.reduce(
                                        (acc, field) => {
                                            const userId = field.user.id;
                                            if (!acc[userId]) {
                                                acc[userId] = {
                                                    user: field.user,
                                                    fields: [],
                                                };
                                            }
                                            acc[userId].fields.push(field);
                                            return acc;
                                        },
                                        {} as Record<number, { user: User; fields: Field[] }>
                                    );

                                    return (
                                        <div className="space-y-8">
                                            {Object.values(fieldsByUser).map(
                                                ({ user, fields: userFields }) => (
                                                    <div
                                                        key={user.id}
                                                        className="rounded-lg border border-gray-700 bg-gray-800 p-6"
                                                    >
                                                        <div className="mb-4 flex items-center justify-between">
                                                            <div>
                                                                <h3 className="text-lg font-semibold text-white">
                                                                    {user.name}
                                                                </h3>
                                                                <p className="text-sm text-gray-400">
                                                                    {user.email}
                                                                </p>
                                                                {user.is_super_user && (
                                                                    <span className="mt-1 inline-block rounded bg-yellow-600 px-2 py-1 text-xs text-white">
                                                                        {t('super_user')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-sm text-gray-400">
                                                                {userFields.length} {t('fields')}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                            {userFields.map((field) => (
                                                                <div
                                                                    key={field.id}
                                                                    className="rounded-lg border border-gray-600 bg-gray-700 p-4"
                                                                >
                                                                    <div className="mb-3">
                                                                        <h4 className="font-semibold text-white">
                                                                            {field.name}
                                                                        </h4>
                                                                        <p className="text-xs text-gray-400">
                                                                            {field.status}
                                                                        </p>
                                                                    </div>
                                                                    <div className="mb-3 space-y-1 text-xs text-gray-300">
                                                                        <div className="flex justify-between">
                                                                            <span>
                                                                                {t('area')}:
                                                                            </span>
                                                                            <span className="text-white">
                                                                                {field.totalArea?.toFixed(
                                                                                    2
                                                                                )}{' '}
                                                                                ไร่
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>
                                                                                {t('plants')}:
                                                                            </span>
                                                                            <span className="text-white">
                                                                                {field.totalPlants}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>
                                                                                {t('status')}:
                                                                            </span>
                                                                            <span
                                                                                className={`${
                                                                                    field.isCompleted
                                                                                        ? 'text-green-400'
                                                                                        : 'text-yellow-400'
                                                                                }`}
                                                                            >
                                                                                {field.isCompleted
                                                                                    ? t('completed')
                                                                                    : t(
                                                                                          'in_progress'
                                                                                      )}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>
                                                                                {t('created')}:
                                                                            </span>
                                                                            <span className="text-white">
                                                                                {new Date(
                                                                                    field.created_at
                                                                                ).toLocaleDateString()}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleDeleteField(
                                                                                field.id
                                                                            )
                                                                        }
                                                                        className="w-full rounded bg-red-600 px-3 py-2 text-xs text-white transition-colors hover:bg-red-700"
                                                                    >
                                                                        <FaTrash className="mr-1 h-3 w-3" />
                                                                        {t('delete')}
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {activeTab === 'folders' && (
                            <div>
                                <div className="mb-6 flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-white">
                                        {t('folder_management')}
                                    </h2>
                                    <button
                                        onClick={() => setShowCreateFolderModal(true)}
                                        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
                                    >
                                        <FaPlus className="h-4 w-4" />
                                        {t('create_folder')}
                                    </button>
                                </div>

                                {/* Group folders by user */}
                                {(() => {
                                    const foldersByUser = folders.reduce(
                                        (acc, folder) => {
                                            const userId = folder.user.id;
                                            if (!acc[userId]) {
                                                acc[userId] = {
                                                    user: folder.user,
                                                    folders: [],
                                                };
                                            }
                                            acc[userId].folders.push(folder);
                                            return acc;
                                        },
                                        {} as Record<number, { user: User; folders: Folder[] }>
                                    );

                                    return (
                                        <div className="space-y-8">
                                            {Object.values(foldersByUser).map(
                                                ({ user, folders: userFolders }) => (
                                                    <div
                                                        key={user.id}
                                                        className="rounded-lg border border-gray-700 bg-gray-800 p-6"
                                                    >
                                                        <div className="mb-4 flex items-center justify-between">
                                                            <div>
                                                                <h3 className="text-lg font-semibold text-white">
                                                                    {user.name}
                                                                </h3>
                                                                <p className="text-sm text-gray-400">
                                                                    {user.email}
                                                                </p>
                                                                {user.is_super_user && (
                                                                    <span className="mt-1 inline-block rounded bg-yellow-600 px-2 py-1 text-xs text-white">
                                                                        {t('super_user')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-sm text-gray-400">
                                                                {userFolders.length} {t('folders')}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                            {userFolders.map((folder) => (
                                                                <div
                                                                    key={folder.id}
                                                                    className="rounded-lg border border-gray-600 bg-gray-700 p-4"
                                                                >
                                                                    <div className="mb-3">
                                                                        <h4 className="font-semibold text-white">
                                                                            {folder.name}
                                                                        </h4>
                                                                        <p className="text-xs text-gray-400">
                                                                            {folder.type}
                                                                        </p>
                                                                    </div>
                                                                    <div className="mb-3 space-y-1 text-xs text-gray-300">
                                                                        <div className="flex justify-between">
                                                                            <span>
                                                                                {t('created')}:
                                                                            </span>
                                                                            <span className="text-white">
                                                                                {new Date(
                                                                                    folder.created_at
                                                                                ).toLocaleDateString()}
                                                                            </span>
                                                                        </div>
                                                                        {folder.color && (
                                                                            <div className="flex items-center justify-between">
                                                                                <span>
                                                                                    {t('color')}:
                                                                                </span>
                                                                                <div
                                                                                    className="h-4 w-4 rounded-full border border-gray-500"
                                                                                    style={{
                                                                                        backgroundColor:
                                                                                            folder.color,
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleDeleteFolder(
                                                                                folder.id
                                                                            )
                                                                        }
                                                                        className="w-full rounded bg-red-600 px-3 py-2 text-xs text-white transition-colors hover:bg-red-700"
                                                                    >
                                                                        <FaTrash className="mr-1 h-3 w-3" />
                                                                        {t('delete')}
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer />

            {/* Create Folder Modal */}
            {showCreateFolderModal && (
                <CreateFolderModal
                    isOpen={showCreateFolderModal}
                    onClose={() => setShowCreateFolderModal(false)}
                    onCreate={handleCreateFolder}
                    users={users}
                    t={t}
                />
            )}

            {/* Create User Modal */}
            {showCreateUserModal && (
                <CreateUserModal
                    isOpen={showCreateUserModal}
                    onClose={() => setShowCreateUserModal(false)}
                    onCreate={handleCreateUser}
                    t={t}
                />
            )}
        </div>
    );
}

// Create Folder Modal Component
const CreateFolderModal = ({
    isOpen,
    onClose,
    onCreate,
    users,
    t,
}: {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (folder: Omit<Folder, 'id' | 'created_at' | 'user'> & { user_id: number }) => void;
    users: User[];
    t: (key: string) => string;
}) => {
    const [folderName, setFolderName] = useState('');
    const [folderType, setFolderType] = useState<'custom'>('custom');
    const [folderColor, setFolderColor] = useState('#6366f1');
    const [folderIcon, setFolderIcon] = useState('📁');
    const [selectedUserId, setSelectedUserId] = useState<number | ''>('');

    const colors = [
        { name: 'Blue', value: '#3b82f6' },
        { name: 'Green', value: '#10b981' },
        { name: 'Purple', value: '#8b5cf6' },
        { name: 'Red', value: '#ef4444' },
        { name: 'Yellow', value: '#f59e0b' },
        { name: 'Pink', value: '#ec4899' },
    ];

    const icons = ['📁', '📂', '🗂️', '📋', '📝', '📌', '🏷️', '⭐', '💡', '🎯'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!folderName.trim() || !selectedUserId) return;

        onCreate({
            name: folderName.trim(),
            type: folderType,
            user_id: selectedUserId as number,
            color: folderColor,
            icon: folderIcon,
        });

        setFolderName('');
        setFolderColor('#6366f1');
        setFolderIcon('📁');
        setSelectedUserId('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
            <div className="relative z-[10000] mx-4 w-full max-w-md rounded-lg bg-gray-800 p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">{t('create_folder')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            {t('select_user')}
                        </label>
                        <select
                            value={selectedUserId}
                            onChange={(e) =>
                                setSelectedUserId(e.target.value ? Number(e.target.value) : '')
                            }
                            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                            required
                        >
                            <option value="">{t('select_user')}</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.email})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            {t('folder_name')}
                        </label>
                        <input
                            type="text"
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                            placeholder={t('enter_folder_name')}
                            autoFocus
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            {t('folder_icon')}
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                            {icons.map((icon) => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setFolderIcon(icon)}
                                    className={`rounded p-2 text-xl ${
                                        folderIcon === icon
                                            ? 'bg-blue-600'
                                            : 'bg-gray-700 hover:bg-gray-600'
                                    }`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            {t('folder_color')}
                        </label>
                        <div className="grid grid-cols-6 gap-2">
                            {colors.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setFolderColor(color.value)}
                                    className={`h-8 w-8 rounded-full border-2 ${
                                        folderColor === color.value
                                            ? 'border-white'
                                            : 'border-gray-600'
                                    }`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded px-4 py-2 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!folderName.trim() || !selectedUserId}
                            className="rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                            {t('create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Create User Modal Component
const CreateUserModal = ({
    isOpen,
    onClose,
    onCreate,
    t,
}: {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (user: Omit<User, 'id' | 'created_at'> & { password: string }) => void;
    t: (key: string) => string;
}) => {
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [userPassword, setUserPassword] = useState('');
    const [isSuperUser, setIsSuperUser] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userName.trim() || !userEmail.trim() || !userPassword.trim()) return;

        onCreate({
            name: userName.trim(),
            email: userEmail.trim(),
            password: userPassword,
            is_super_user: isSuperUser,
        });

        setUserName('');
        setUserEmail('');
        setUserPassword('');
        setIsSuperUser(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
            <div className="relative z-[10000] mx-4 w-full max-w-md rounded-lg bg-gray-800 p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">{t('create_user')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            {t('name')}
                        </label>
                        <input
                            type="text"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                            placeholder={t('enter_name')}
                            autoFocus
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            {t('email')}
                        </label>
                        <input
                            type="email"
                            value={userEmail}
                            onChange={(e) => setUserEmail(e.target.value)}
                            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                            placeholder={t('enter_email')}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                            {t('password')}
                        </label>
                        <input
                            type="password"
                            value={userPassword}
                            onChange={(e) => setUserPassword(e.target.value)}
                            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                            placeholder={t('enter_password')}
                            required
                            minLength={8}
                        />
                    </div>
                    <div className="mb-6">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={isSuperUser}
                                onChange={(e) => setIsSuperUser(e.target.checked)}
                                className="mr-2 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-300">{t('make_super_user')}</span>
                        </label>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded px-4 py-2 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!userName.trim() || !userEmail.trim() || !userPassword.trim()}
                            className="rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                            {t('create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
