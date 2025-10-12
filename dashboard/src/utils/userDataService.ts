interface CachedUserData {
    avatar: string;
    username: string;
    displayName: string;
    timestamp: number;
}

interface DiscordUserData {
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
    discriminator: string;
}

interface CurrentUserData {
    id: string;
    displayName: string;
    avatar: string;
}

class UserDataService {
    private static instance: UserDataService;
    private userCache: Map<string, CachedUserData>;
    private readonly CACHE_DURATION = 30 * 60 * 1000;
    private cleanupInterval: number | null = null;
    private pendingFetches: Map<string, Promise<CachedUserData>> = new Map();

    private constructor() {
        this.userCache = new Map();
        this.startCleanupInterval();
        
        try {
            const cached = sessionStorage.getItem('userDataCache');
            if (cached) {
                const parsedCache = JSON.parse(cached);
                Object.entries(parsedCache).forEach(([key, value]) => {
                    this.userCache.set(key, value as CachedUserData);
                });
            }
        } catch (error) {
        }
    }

    private saveToSessionStorage() {
        try {
            const cacheObject = Object.fromEntries(this.userCache.entries());
            sessionStorage.setItem('userDataCache', JSON.stringify(cacheObject));
        } catch (error) {
        }
    }

    public getDefaultUserData(userId: string): CachedUserData {
        return {
            avatar: this.getDefaultAvatar('User'),
            username: 'Loading...',
            displayName: 'Loading...',
            timestamp: Date.now()
        };
    }

    public async getUserData(userId: string): Promise<CachedUserData> {
        try {
            const cached = this.userCache.get(userId);
            if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
                return cached;
            }

            const defaultData = this.getDefaultUserData(userId);
            this.fetchAndUpdateUser(userId);
            
            return defaultData;
        } catch (error) {
            return this.getDefaultUserData(userId);
        }
    }

    private async fetchAndUpdateUser(userId: string): Promise<void> {
        try {
            if (this.pendingFetches.has(userId)) {
                return;
            }

            const fetchPromise = this.fetchUserData(userId);
            this.pendingFetches.set(userId, fetchPromise);

            const userData = await fetchPromise;
            this.userCache.set(userId, userData);
            this.saveToSessionStorage();
            this.pendingFetches.delete(userId);

            window.dispatchEvent(new CustomEvent('userDataUpdated', {
                detail: { userId, userData }
            }));
        } catch (error) {
            this.pendingFetches.delete(userId);
        }
    }

    public static getInstance(): UserDataService {
        if (!UserDataService.instance) {
            UserDataService.instance = new UserDataService();
        }
        return UserDataService.instance;
    }

    private startCleanupInterval() {
        this.cleanupInterval = window.setInterval(() => {
            const now = Date.now();
            for (const [key, value] of Array.from(this.userCache.entries())) {
                if (now - value.timestamp > this.CACHE_DURATION) {
                    this.userCache.delete(key);
                }
            }
        }, this.CACHE_DURATION);
    }

    public async prefetchUsers(userIds: string[]): Promise<void> {
        const uniqueIds = Array.from(new Set(userIds));
        const now = Date.now();
        const idsToFetch = uniqueIds.filter(id => {
            const cached = this.userCache.get(id);
            return !cached || now - cached.timestamp > this.CACHE_DURATION;
        });

        await Promise.all(idsToFetch.map(id => this.getUserData(id)));
    }

    private async fetchUserData(userId: string): Promise<CachedUserData> {
        try {
            const response = await fetch(`/api/tickets/user/${userId}`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.status === 404) {
                return this.getDefaultUserData(userId);
            }

            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }

            const userData: DiscordUserData = await response.json();

            let avatarUrl: string;
            if (userData.avatar && userData.avatar.startsWith('https://')) {
                avatarUrl = userData.avatar;
            } else if (userData.avatar) {
                avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${userData.avatar}.webp?size=128`;
            } else {
                avatarUrl = this.getDefaultAvatar(userData.username);
            }

            const cachedData: CachedUserData = {
                avatar: avatarUrl,
                username: userData.username,
                displayName: userData.global_name || userData.username,
                timestamp: Date.now()
            };

            this.userCache.set(userId, cachedData);
            return cachedData;
        } catch (error) {
            return this.getDefaultUserData(userId);
        }
    }

    private getDefaultAvatar(username: string): string {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=7289DA&color=fff&size=128`;
    }

    public destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.userCache.clear();
        this.pendingFetches.clear();
    }

    public async getCurrentUser(): Promise<CurrentUserData | null> {
        try {
            const response = await fetch('/api/auth/me');
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            return {
                id: data.id,
                displayName: data.displayName || data.username,
                avatar: data.avatar || this.getDefaultAvatar(data.username)
            };
        } catch (error) {
            return null;
        }
    }
}

export const userDataService = UserDataService.getInstance();