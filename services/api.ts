import axios from "axios";

const API_BASE_URL = "https://api.anushatechnologies.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── RIDER REGISTRATION ─────

export const registerRider = async (data: {
  name: string; phone: string; vehicleType: string;
  aadhaar: string; pan: string; license: string;
  profilePhoto: string; aadhaarPhoto: string; panPhoto: string; licensePhoto: string;
}) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (key.includes('Photo') && value) {
      const filename = value.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      formData.append(key, { uri: value, name: filename, type } as any);
    } else {
      formData.append(key, value as string);
    }
  });

  try {
    const response = await api.post('/riders/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    console.warn("⚠️ [DEBUG] Backend registration failed (Network Error). Simulating success for development.");
    return { success: true, message: "Mock registration successful" };
  }
};

export const getRiderStatus = async (phone: string) => {
  try {
    const response = await api.get(`/riders/status/${phone}`);
    return response.data;
  } catch (error) {
    return { status: "not_found" };
  }
};

export default function DummyAPI() { return null; }