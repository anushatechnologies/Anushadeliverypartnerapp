export const sanitizePhone = (value: string) => value.replace(/\D/g, '').slice(0, 10);

export const formatPhone = (value: string) => {
  const digits = sanitizePhone(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
};

export const sanitizeAadhaar = (value: string) => value.replace(/\D/g, '').slice(0, 12);

export const formatAadhaar = (value: string) =>
  sanitizeAadhaar(value)
    .match(/.{1,4}/g)
    ?.join(' ') ?? '';

export const normalizePan = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);

export const normalizeLicense = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16);

export const normalizeRcNumber = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 20);

export const normalizeInsuranceNumber = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 30);

export const isValidPan = (value: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value);
export const isValidAadhaar = (value: string) => /^\d{12}$/.test(value);
export const isValidLicense = (value: string) => /^[A-Z0-9]{10,16}$/.test(value);
export const isValidRcNumber = (value: string) => /^[A-Z0-9-]{6,20}$/.test(value);
export const isValidInsuranceNumber = (value: string) =>
  value.length === 0 || /^[A-Z0-9-]{6,30}$/.test(value);
