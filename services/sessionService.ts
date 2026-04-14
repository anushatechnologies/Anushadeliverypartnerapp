import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.anushatechnologies.com';

export const DELIVERY_ACCESS_TOKEN_KEY = '@anusha_jwt_token';
export const DELIVERY_REFRESH_TOKEN_KEY = '@anusha_refresh_token';

type SessionExpiredHandler = () => void | Promise<void>;

let sessionExpiredHandler: SessionExpiredHandler | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const registerDeliverySessionExpiredHandler = (handler: SessionExpiredHandler) => {
  sessionExpiredHandler = handler;
  return () => {
    if (sessionExpiredHandler === handler) {
      sessionExpiredHandler = null;
    }
  };
};

export const getDeliveryAccessToken = async () => AsyncStorage.getItem(DELIVERY_ACCESS_TOKEN_KEY);

export const getDeliveryRefreshToken = async () => AsyncStorage.getItem(DELIVERY_REFRESH_TOKEN_KEY);

export const saveDeliveryTokens = async (accessToken: string, refreshToken?: string | null) => {
  await AsyncStorage.setItem(DELIVERY_ACCESS_TOKEN_KEY, accessToken);

  const nextRefreshToken = refreshToken ?? (await getDeliveryRefreshToken());
  if (nextRefreshToken) {
    await AsyncStorage.setItem(DELIVERY_REFRESH_TOKEN_KEY, nextRefreshToken);
  } else {
    await AsyncStorage.removeItem(DELIVERY_REFRESH_TOKEN_KEY);
  }
};

export const clearDeliveryTokens = async () => {
  await AsyncStorage.multiRemove([DELIVERY_ACCESS_TOKEN_KEY, DELIVERY_REFRESH_TOKEN_KEY]);
};

const notifySessionExpired = async () => {
  if (sessionExpiredHandler) {
    await Promise.resolve(sessionExpiredHandler()).catch(() => undefined);
  }
};

export const refreshDeliverySession = async (): Promise<string | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = await getDeliveryRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/delivery/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          await clearDeliveryTokens();
          await notifySessionExpired();
        }
        return null;
      }

      const data = await response.json();
      const nextAccessToken = data?.accessToken || data?.jwtToken || data?.token || null;
      const nextRefreshToken = data?.refreshToken || refreshToken;

      if (!nextAccessToken) {
        return null;
      }

      await saveDeliveryTokens(nextAccessToken, nextRefreshToken);
      return nextAccessToken;
    } catch (error) {
      console.warn('[sessionService] delivery refresh failed', error);
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

export const logoutDeliverySession = async () => {
  const refreshToken = await getDeliveryRefreshToken();

  if (refreshToken) {
    try {
      await fetch(`${BASE_URL}/api/delivery/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (error) {
      console.warn('[sessionService] delivery logout request failed', error);
    }
  }

  await clearDeliveryTokens();
};
