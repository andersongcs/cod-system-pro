import { createContext, useContext, useEffect, useState } from 'react';
import { authService, User } from '@/lib/auth';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        authService.getSession().then((session) => {
            setUser(session?.user as User | null);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = authService.onAuthStateChange((user) => {
            setUser(user);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await authService.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
