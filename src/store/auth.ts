import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@shared/types';

interface AuthState {
  user: (Omit<User, 'password'> & { token: string }) | null;
  setUser: (u: Omit<User, 'password'> & { token: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (u) => set({ user: u }),
      logout: () => set({ user: null }),
    }),
    { name: 'fitness-auth-storage' }
  )
);

export default useAuthStore;
