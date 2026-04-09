import React, { createContext, useContext, useState, useEffect } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { profileService } from "../services/profileService";
import { authService } from "../services/authService";
import messaging from "@react-native-firebase/messaging";

export type VerificationStatus = "pending" | "approved" | "rejected" | null;

export type UserProfile = {
  id?: number;
  name: string;
  phone: string;
  vehicleType: string;
  vehicleModel?: string;
  registrationNumber?: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  photo: string | null;
  aadhaar?: string;
  pan?: string;
  license?: string;
  aadhaarPhoto?: string | null;
  panPhoto?: string | null;
  licensePhoto?: string | null;
};

type AuthState = {
  user: UserProfile | null;
  verificationStatus: VerificationStatus;
  isLoggedIn: boolean;
  isLoading: boolean;
};

type UserContextType = {
  authState: AuthState;
  login: (phone: string, additionalData?: Partial<UserProfile>, verificationStatus?: VerificationStatus) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  setVerificationStatus: (status: VerificationStatus) => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PROFILE_STATE: "@anusha_bazaar_profile",
};

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    verificationStatus: null,
    isLoggedIn: false,
    isLoading: true,
  });

  // Session Rehydration — token persists until explicit logout or app uninstall
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('@anusha_jwt_token');
        const cachedProfileStr = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_STATE);

        if (token && cachedProfileStr) {
          // ── FAST PATH: restore from cache immediately ──────────────────────
          const cachedProfile = JSON.parse(cachedProfileStr);
          await new Promise(resolve => setTimeout(resolve, 3100));

          setAuthState({
            user: cachedProfile.user,
            verificationStatus: cachedProfile.verificationStatus,
            isLoggedIn: true,
            isLoading: false,
          });

          // Background sync — update profile silently, never log out on failure
          profileService.getStatus()
            .then(async (statusRes) => {
              if (statusRes?.success && statusRes.deliveryPerson) {
                const p = statusRes.deliveryPerson;
                setAuthState(prev => {
                  const updated = {
                    ...prev,
                    user: {
                      ...prev.user,
                      id: p.id,
                      name: `${p.firstName} ${p.lastName}`,
                      vehicleType: p.vehicleType,
                      vehicleModel: p.vehicleModel,
                      registrationNumber: p.registrationNumber,
                      accountName: p.accountName || prev.user?.accountName,
                      accountNumber: p.accountNumber || prev.user?.accountNumber,
                      bankName: p.bankName || prev.user?.bankName,
                      ifscCode: p.ifscCode || prev.user?.ifscCode,
                      photo: p.profilePhotoUrl || prev.user?.photo,
                    },
                    verificationStatus: p.approvalStatus?.toLowerCase() || prev.verificationStatus,
                  };
                  AsyncStorage.setItem(STORAGE_KEYS.PROFILE_STATE, JSON.stringify({ user: updated.user, verificationStatus: updated.verificationStatus })).catch(() => {});
                  return updated as any;
                });
              }
            })
            .catch(async (e) => {
              // Only logout if the server explicitly rejects the token (401)
              if (e?.response?.status === 401) {
                await AsyncStorage.multiRemove(['@anusha_jwt_token', STORAGE_KEYS.PROFILE_STATE]);
                setAuthState({ user: null, verificationStatus: null, isLoggedIn: false, isLoading: false });
              }
              // Any other error (network, timeout) — keep the user logged in
            });

          // Sync FCM token silently
          if (cachedProfile.user?.phone) {
            try {
              messaging().getToken()
                .then(tk => { if (tk) authService.saveFcmToken(cachedProfile.user.phone, tk); })
                .catch(() => {});
            } catch (_) {}
          }
          return;
        }

        if (token) {
          // ── Token exists but cache missing — try network restore ───────────
          try {
            const statusRes = await profileService.getStatus();
            if (statusRes?.success && statusRes.deliveryPerson) {
              const p = statusRes.deliveryPerson;
              await new Promise(resolve => setTimeout(resolve, 3100));

              const newState = {
                user: {
                  id: p.id,
                  name: `${p.firstName} ${p.lastName}`,
                  phone: p.phoneNumber,
                  vehicleType: p.vehicleType,
                  vehicleModel: p.vehicleModel || "",
                  registrationNumber: p.registrationNumber || "",
                  accountName: p.accountName || "",
                  accountNumber: p.accountNumber || "",
                  bankName: p.bankName || "",
                  ifscCode: p.ifscCode || "",
                  photo: p.profilePhotoUrl || null,
                },
                verificationStatus: p.approvalStatus?.toLowerCase() || null,
                isLoggedIn: true,
                isLoading: false,
              };
              setAuthState(newState as any);
              await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_STATE, JSON.stringify({ user: newState.user, verificationStatus: newState.verificationStatus }));

              if (p.phoneNumber) {
                try {
                  messaging().getToken()
                    .then(tk => { if (tk) authService.saveFcmToken(p.phoneNumber, tk); })
                    .catch(() => {});
                } catch (_) {}
              }
              return;
            }
          } catch (e: any) {
            if (e?.response?.status === 401) {
              // Token explicitly rejected — clear and show login
              await AsyncStorage.multiRemove(['@anusha_jwt_token', STORAGE_KEYS.PROFILE_STATE]);
            } else {
              // Network/server error — keep token, show login UI with message
              console.warn("Session restore: network unavailable, will retry on next launch");
            }
          }
        }
      } catch (e) {
        console.warn("Session init error", e);
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

      setAuthState({ user: null, verificationStatus: null, isLoggedIn: false, isLoading: false });
    };

    initializeAuth();
  }, []);

  const persistProfile = async (newState: Partial<AuthState>) => {
    try {
      const updated = { ...authState, ...newState };
      const { isLoading, isLoggedIn, ...toPersist } = updated;
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_STATE, JSON.stringify(toPersist));
      setAuthState(updated);
    } catch (err) {}
  };

  const login = async (phone: string, additionalData?: Partial<UserProfile>, verificationStatus?: VerificationStatus) => {
    // Manual state override mapped post-OTP since Firebase sync might take ~100ms
    const newState: Partial<AuthState> = {
      isLoggedIn: true,
      user: {
        name: "",
        phone,
        vehicleType: "",
        photo: null,
        ...(additionalData || {})
      },
      ...(verificationStatus !== undefined ? { verificationStatus } : {})
    };
    await persistProfile(newState);
  };

  const logout = async () => {
    try {
      const firebase = require("firebase/compat/app").default;
      if (firebase) {
         require("firebase/compat/auth");
         await firebase.auth().signOut();
      }
    } catch(e) {
      console.warn("Logout Web Auth Error:", e);
    }
    
    try {
      // Explicitly wipe state and storage independently so bypass logins also get correctly logged out
      await AsyncStorage.removeItem(STORAGE_KEYS.PROFILE_STATE);
      await AsyncStorage.removeItem('@anusha_jwt_token');
    } catch(e) {
      console.warn("AsyncStorage Purge Error:", e);
    }

    setAuthState({ user: null, verificationStatus: null, isLoggedIn: false, isLoading: false });
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (authState.user) {
      await persistProfile({ user: { ...authState.user, ...data } });
    } else {
      console.warn("🔍 [DEBUG] Cannot update profile - no user logged in");
    }
  };

  const setVerificationStatus = async (status: VerificationStatus) => {
    await persistProfile({ verificationStatus: status });
  };

  return (
    <UserContext.Provider value={{ authState, login, logout, updateProfile, setVerificationStatus }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used inside UserProvider");
  return context;
};
