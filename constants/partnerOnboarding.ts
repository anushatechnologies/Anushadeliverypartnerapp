import type { RegistrationDocumentKey, VehicleType } from '@/types/partner';

export const registrationSteps = [
  'Verify mobile',
  'Personal info',
  'Vehicle setup',
  'Documents',
  'Bank details',
] as const;

export const vehicleOptions: Array<{
  value: VehicleType;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: 'BIKE',
    label: 'Bike',
    description: 'Petrol or CNG motorbike. RC and driving license required.',
    icon: 'motorbike',
  },
  {
    value: 'SCOOTY',
    label: 'Scooty',
    description: 'Petrol or CNG scooter. RC and driving license required.',
    icon: 'scooter',
  },
  {
    value: 'EV',
    label: 'Electric Bike',
    description: 'Electric two-wheeler. No RC or insurance needed.',
    icon: 'lightning-bolt',
  },
  {
    value: 'AUTO',
    label: 'Auto',
    description: 'Auto-rickshaw. Includes loading/unloading charges.',
    icon: 'rickshaw',
  },
  {
    value: 'HEAVY',
    label: 'Heavy Vehicle',
    description: 'Large vehicle for bulk orders. Loading/unloading charges apply.',
    icon: 'truck-fast-outline',
  },
];

export const documentLabels: Record<
  RegistrationDocumentKey,
  {
    title: string;
    subtitle: string;
    helper: string;
    optional?: boolean;
  }
> = {
  profilePhoto: {
    title: 'Profile photo',
    subtitle: 'Live selfie for admin review',
    helper: 'Use a clear front-facing photo with good lighting.',
  },
  aadhaarFront: {
    title: 'Aadhaar front',
    subtitle: 'Front side of Aadhaar',
    helper: 'Must match the 12-digit Aadhaar number you enter.',
  },
  aadhaarBack: {
    title: 'Aadhaar back',
    subtitle: 'Back side of Aadhaar',
    helper: 'Upload the rear side clearly and without glare.',
  },
  panCard: {
    title: 'PAN card',
    subtitle: 'Permanent account number proof',
    helper: 'PAN must match the exact format ABCDE1234F.',
  },
  drivingLicense: {
    title: 'Driving license',
    subtitle: 'Valid vehicle license',
    helper: 'Required for all partner vehicles in this app.',
  },
  rcBook: {
    title: 'RC book',
    subtitle: 'Vehicle registration proof',
    helper: 'Required for Bike, Scooty, Auto, and Heavy vehicles. Not required for Electric Bike (EV).',
  },
  insurance: {
    title: 'Insurance',
    subtitle: 'Vehicle insurance document',
    helper: 'Optional for all vehicle types. Upload now or later from the profile flow.',
    optional: true,
  },
};

/**
 * Required uploads for non-EV vehicles.
 * RC Book is required for BIKE, SCOOTY, AUTO, HEAVY.
 * EV only needs: profilePhoto, aadhaarFront, aadhaarBack, panCard, drivingLicense.
 */
export const requiredDocumentKeys: RegistrationDocumentKey[] = [
  'profilePhoto',
  'aadhaarFront',
  'aadhaarBack',
  'panCard',
  'drivingLicense',
  'rcBook',
];

/** Required uploads specifically for EV (Electric Bike) — no RC. */
export const evRequiredDocumentKeys: RegistrationDocumentKey[] = [
  'profilePhoto',
  'aadhaarFront',
  'aadhaarBack',
  'panCard',
  'drivingLicense',
];

/** Returns the required document keys based on vehicle type. */
export function getRequiredDocumentKeys(vehicleType: VehicleType): RegistrationDocumentKey[] {
  return vehicleType === 'EV' ? evRequiredDocumentKeys : requiredDocumentKeys;
}
