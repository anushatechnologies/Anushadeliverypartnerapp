export type VehicleType = 'BIKE' | 'SCOOTY' | 'EV' | 'AUTO' | 'HEAVY';

export type RegistrationDocumentKey =
  | 'profilePhoto'
  | 'aadhaarFront'
  | 'aadhaarBack'
  | 'panCard'
  | 'drivingLicense'
  | 'rcBook'
  | 'insurance';

export interface RegistrationFormValues {
  firstName: string;
  lastName: string;
  phone: string;
  vehicleType: VehicleType;
  vehicleModel: string;
  registrationNumber: string;
  aadhaarNumber: string;
  panNumber: string;
  drivingLicenseNumber: string;
  insuranceNumber: string;
}

export type RegistrationUploads = Record<RegistrationDocumentKey, string | null>;

export interface DeliveryAuthResponse {
  jwtToken?: string;
  deliveryPersonId: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phoneNumber?: string;
  approvalStatus?: string;
  profilePhotoUrl?: string;
  profilePhotoStatus?: string;
  vehicleType?: string;
  vehicleModel?: string;
  registrationNumber?: string;
  onboardingStatus?: Record<string, any>;
  message?: string;
}
