import { SidebarProvider } from '@/components/ui/sidebar';
import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
}

export function AppShell({ children, variant = 'header' }: AppShellProps) {
    // Defensive usePage call with error handling
    let isOpen = false;
    try {
        isOpen = usePage<SharedData>().props.sidebarOpen;
    } catch (error) {
        console.warn('Inertia context not available in AppShell, using fallback values');
        isOpen = false;
    }

    if (variant === 'header') {
        return <div className="flex min-h-screen w-full flex-col">{children}</div>;
    }

    return <SidebarProvider defaultOpen={isOpen}>{children}</SidebarProvider>;
}
