import { create } from "zustand";
import { persist } from "zustand/middleware";

const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user, token) =>
        set((state) => ({
          user: { ...state.user, ...user }, // ✅ merge updates
          token: token ?? state.token, // ✅ keep existing token if not passed
        })),
      clearUser: () => set({ user: null, token: null }),
    }),
    {
      name: "user-storage",
      storage: {
        getItem: (name) => JSON.parse(localStorage.getItem(name) || "{}"),
        setItem: (name, value) =>
          localStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

export default useUserStore;
