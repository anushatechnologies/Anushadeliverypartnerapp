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

  // Session Rehydration Listener
  useEffect(() => {
    const initializeAuth = async () => {
      try {
         const token = await AsyncStorage.getItem('@anusha_jwt_token');
         const cachedProfileStr = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_STATE);
         
         if (token && cachedProfileStr) {
            // INSTANT LOGIN VIA CACHE (No network delay, fixes reload bugs)
            const cachedProfile = JSON.parse(cachedProfileStr);
            setAuthState({
              user: cachedProfile.user,
              verificationStatus: cachedProfile.verificationStatus,
              isLoggedIn: true,
              isLoading: false,
            });
            
            // Background sync quietly
            profileService.getStatus().then(async (statusRes) => {
               if (statusRes.success && statusRes.deliveryPerson) {
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
                          registrationNumber: p.registrationNumber
                       },
                       verificationStatus: p.approvalStatus?.toLowerCase() || prev.verificationStatus
                     };
                     AsyncStorage.setItem(STORAGE_KEYS.PROFILE_STATE, JSON.stringify({ user: updated.user, verificationStatus: updated.verificationStatus })).catch(()=>{});
                     return updated as any;
                  });
               }
            }).catch(e => console.warn("Background sync failed", e));

            // SYNC FCM TOKEN WITH ADMIN (Background sync quietly)
            if (cachedProfile.user?.phone) {
               messaging().getToken()
                  .then(tk => { if (tk) return authService.saveFcmToken(cachedProfile.user.phone, tk); })
                  .catch(() => {});
            }
            return; // We have successfully logged them in instantly
         } else if (token) {
            // Token exists but cache was cleared, wait for network sync
            const statusRes = await profileService.getStatus();
            if (statusRes.success && statusRes.deliveryPerson) {
               const p = statusRes.deliveryPerson;
               const newState = {
                 user: {
                   id: p.id,
                   name: `${p.firstName} ${p.lastName}`,
                   phone: p.phoneNumber,
                   vehicleType: p.vehicleType,
                   vehicleModel: p.vehicleModel || "",
                   registrationNumber: p.registrationNumber || "",
                   photo: null,
                 },
                 verificationStatus: p.approvalStatus?.toLowerCase() || null,
                 isLoggedIn: true,
                 isLoading: false,
               };
               setAuthState(newState as any);
               await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_STATE, JSON.stringify({ user: newState.user, verificationStatus: newState.verificationStatus }));
               
               // SYNC FCM TOKEN (Network Refresh Path)
               if (p.phoneNumber) {
                  messaging().getToken()
                    .then(tk => { if (tk) return authService.saveFcmToken(p.phoneNumber, tk); })
                    .catch(() => {});
               }
               return;
            }
         }
      } catch (e) {
         console.warn("Backend session restore failed or unavailable", e);
      }

      // Fully Logged Out State (Fallback)
      setAuthState({
         user: null,
         verificationStatus: null,
         isLoggedIn: false,
         isLoading: false,
      });
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