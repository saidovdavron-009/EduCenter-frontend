"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser, UserRole } from "@/types";
import { authApi } from "@/lib/api";

interface ProfileResponse {
  fullName?: string | null;
  avatarUrl?: string | null;
  profile?: { id: string; fullName: string; avatarUrl?: string } | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  // Zustand's persist middleware restores state from localStorage
  // asynchronously after first mount (to avoid SSR hydration mismatches).
  // Route guards that read isAuthenticated must wait for this to flip true
  // first, otherwise an already-logged-in user hard-reloading a page briefly
  // reads isAuthenticated:false and gets bounced to login.
  hasHydrated: boolean;
  setAuth: (user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  hydrateProfile: (profileData: ProfileResponse) => void;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  setHasHydrated: (value: boolean) => void;
}

// Older builds stored raw tokens in localStorage; now that they live in httpOnly
// cookies, strip any leftovers from browsers that logged in before this migration.
if (typeof window !== "undefined") {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),

      // accessToken/refreshToken live in httpOnly cookies the backend sets on
      // /auth/login — they're never readable by JS, so the store only tracks
      // the user profile for display purposes; the cookie is what the backend
      // actually checks on every request.
      setAuth: (user) => {
        set({ user, isAuthenticated: true });
      },

      setUser: (user) => set({ user }),

      // ADMIN accounts have no Student/Teacher/Parent row, so the backend never
      // returns a nested `profile` for them — their name lives on the User entity
      // itself (top-level `fullName`). Fall back to that so admins see their name
      // instead of their login ID in the header/sidebar.
      hydrateProfile: (profileData) => {
        const { user } = get();
        if (!user) return;
        const fullName = profileData.profile?.fullName || profileData.fullName;
        if (!fullName) return;
        set({
          user: {
            ...user,
            profile: {
              id: profileData.profile?.id || user.id,
              fullName,
              avatarUrl: profileData.profile?.avatarUrl || profileData.avatarUrl || undefined,
            },
          },
        });
      },

      // httpOnly cookies can't be cleared from JS — ask the backend to drop them
      // (and invalidate the stored refresh token) before wiping local state.
      logout: () => {
        set({ user: null, isAuthenticated: false });
        if (typeof window !== "undefined") {
          authApi.logout().catch(() => {});
        }
      },

      hasRole: (role) => {
        const { user } = get();
        if (!user) return false;
        if (Array.isArray(role)) return role.includes(user.role);
        return user.role === role;
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
