import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { createSeedState, reducer, type AppAction, type AppState } from "@shared/localsync";

const STORAGE_KEY = "novacart-localsync-state";

type LocalSyncContextValue = { state: AppState; dispatch: React.Dispatch<AppAction> };
const LocalSyncContext = createContext<LocalSyncContextValue | null>(null);

function initialState() {
  if (typeof window === "undefined") return createSeedState();
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...createSeedState(), ...JSON.parse(saved) } as AppState;
  } catch {
    // A blocked or malformed localStorage should never prevent the demo from loading.
  }
  return createSeedState();
}

export function LocalSyncProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Demo state still works in memory when storage is unavailable.
    }
  }, [state]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <LocalSyncContext.Provider value={value}>{children}</LocalSyncContext.Provider>;
}

export function useLocalSync() {
  const value = useContext(LocalSyncContext);
  if (!value) throw new Error("useLocalSync must be used inside LocalSyncProvider");
  return value;
}
