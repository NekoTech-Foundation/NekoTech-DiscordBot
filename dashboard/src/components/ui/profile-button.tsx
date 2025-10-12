import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faSignOut, faChevronDown, faCog } from "@fortawesome/free-solid-svg-icons";
import { auth } from '../../lib/auth/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User } from '../../lib/auth/auth';
import { socket } from '../../socket';

interface UserStatus {
    status: 'online' | 'idle' | 'dnd' | 'offline';
}

interface ProfileButtonProps {
    className?: string;
    minimal?: boolean;
}

export function ProfileButton({ className = '', minimal = false }: ProfileButtonProps) {
    const [user, setUser] = useState<User | null>(null);
    const [userStatus, setUserStatus] = useState<UserStatus>({ status: 'offline' });
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const userData = await auth.getUser();
                setUser(userData);

                if (userData) {
                    await fetchUserStatus();
                }
            } catch (error) {
                console.error('Failed to load user:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadUser();

        socket.on('presenceUpdate', (data: { userId: string; status: string }) => {
            if (user && data.userId === user.id) {
                setUserStatus({ status: data.status as UserStatus['status'] });
            }
        });

        const statusInterval = setInterval(fetchUserStatus, 30000);

        return () => {
            clearInterval(statusInterval);
            socket.off('presenceUpdate');
        };
    }, [user]);

    const fetchUserStatus = async () => {
        if (!user) return;
        
        try {
            const response = await fetch(`${window.DASHBOARD_CONFIG?.API_URL}/auth/status`, {
                credentials: 'include'
            });
            if (response.ok) {
                const status = await response.json();
                setUserStatus(status);
            }
        } catch (error) {
            console.error('Failed to fetch user status:', error);
        }
    };

    const handleLogout = async () => {
        await auth.logout();
        navigate('/auth/signin');
    };

    const getRoleColor = (highestRole: string): string => {
        if (!highestRole) return 'bg-secondary';
        
        const roleColorMap: { [key: string]: string } = {
            'admin': 'bg-red-500',
            'administrator': 'bg-red-500',
            'moderator': 'bg-green-500',
            'mod': 'bg-green-500',
            'helper': 'bg-blue-500',
            'support': 'bg-blue-500',
            'staff': 'bg-purple-500',
            'developer': 'bg-yellow-500',
            'dev': 'bg-yellow-500',
            'owner': 'bg-red-600',
            'co-owner': 'bg-red-500',
            'member': 'bg-primary',
            'vip': 'bg-yellow-600',
            'premium': 'bg-yellow-600',
            'donator': 'bg-pink-500',
            'supporter': 'bg-pink-500',
            'trusted': 'bg-green-600',
            'verified': 'bg-blue-600',
            'veteran': 'bg-purple-600',
            'active': 'bg-green-400',
            'booster': 'bg-pink-600',
            'nitro': 'bg-pink-600'
        };
        
        const lowerRole = highestRole.toLowerCase();
        for (const [key, color] of Object.entries(roleColorMap)) {
            if (lowerRole.includes(key)) {
                return color;
            }
        }
        
        return 'bg-secondary';
    };

    const getInitials = (displayName: string): string => {
        if (!displayName) return '?';
        return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if (isLoading) {
        return minimal ? (
            <div className={`flex items-center space-x-3 animate-pulse ${className}`}>
                <div className="w-8 h-8 rounded-full bg-secondary/50" />
                <div className="h-4 w-24 bg-secondary/50 rounded" />
            </div>
        ) : (
            <div className={`flex items-center space-x-3 p-2 rounded-xl bg-secondary/30 border border-border animate-pulse ${className}`}>
                <div className="w-8 h-8 rounded-full bg-secondary/50" />
                <div>
                    <div className="h-4 w-24 bg-secondary/50 rounded" />
                    <div className="h-3 w-16 bg-secondary/50 rounded mt-1" />
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <button
                onClick={() => auth.login()}
                className="relative group flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-[#5865F2]/20 hover:scale-[1.02]"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-[#5865F2]/50 to-[#4752C4]/50 rounded-xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
                <FontAwesomeIcon icon={faUser} className="relative h-4 w-4" />
                <span className="relative font-medium">Sign In with Discord</span>
            </button>
        );
    }

    const avatarUrl = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`;

    const displayName = user.global_name || user.username;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online':
                return 'bg-green-500';
            case 'idle':
                return 'bg-yellow-500';
            case 'dnd':
                return 'bg-red-500';
            default:
                return 'bg-secondary';
        }
    };

    const goToUserSettings = () => {
        navigate('/user-settings');
        setIsOpen(false);
    };

    if (minimal) {
        return (
            <div className={`group transition-all duration-200 ${className}`}>
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-8 h-8 rounded-full ring-2 transition-all duration-200 ring-border group-hover:ring-primary/50"
                            onError={(e) => {
                                (e.target as HTMLImageElement).onerror = null;
                                (e.target as HTMLImageElement).src = `https://cdn.discordapp.com/embed/avatars/0.png`;
                            }}
                        />
                        <motion.div
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getStatusColor(userStatus.status)} rounded-full ring-2 ring-background`}
                            animate={{
                                scale: [1, 1.1, 1],
                                opacity: [1, 0.8, 1],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                        <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors duration-200">
                            {displayName}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="group flex items-center space-x-3 px-4 py-2 bg-card/50 rounded-xl border border-border backdrop-blur-xl transition-all duration-300 hover:bg-secondary/50"
            >
                <div className="relative">
                    {/* Status indicator */}
                    <motion.div
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getStatusColor(userStatus.status)} rounded-full ring-2 ring-background z-10`}
                        animate={{
                            scale: [1, 1.1, 1],
                            opacity: [1, 0.8, 1],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />
                    
                    {/* Avatar container with hover effect */}
                    <div className="relative overflow-hidden rounded-lg transition-transform duration-300 group-hover:scale-105">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <img 
                            src={avatarUrl} 
                            alt="Profile"
                            className="relative w-9 h-9 rounded-lg ring-2 ring-border transition-all duration-300 group-hover:ring-primary/50"
                            onError={(e) => {
                                (e.target as HTMLImageElement).onerror = null;
                                (e.target as HTMLImageElement).src = `https://cdn.discordapp.com/embed/avatars/0.png`;
                            }}
                        />
                    </div>
                </div>
                
                <div className="flex items-center space-x-3">
                    <div className="flex flex-col items-start">
                        <span className="text-foreground font-medium text-sm transition-colors duration-300 group-hover:text-primary">
                            {displayName}
                        </span>
                        <span className="text-muted-foreground text-xs transition-colors duration-300 group-hover:text-muted-foreground/80">
                            @{user.username}
                        </span>
                    </div>
                    <FontAwesomeIcon 
                        icon={faChevronDown} 
                        className={`w-3 h-3 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 rounded-xl bg-card/95 backdrop-blur-xl border border-border shadow-xl z-50 overflow-hidden">
                        <div className="p-2">
                            <button
                                onClick={goToUserSettings}
                                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-foreground hover:bg-secondary/50 rounded-lg transition-all duration-200"
                            >
                                <FontAwesomeIcon icon={faCog} className="w-4 h-4" />
                                <span>User Settings</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded-lg transition-all duration-200"
                            >
                                <FontAwesomeIcon icon={faSignOut} className="w-4 h-4" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
} 