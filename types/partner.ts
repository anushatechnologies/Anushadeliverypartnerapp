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

/** Response from GET /api/delivery/auth/check-phone/{phone} */
export interface CheckPhoneResponse {
  exists: boolean;
  isApproved?: boolean;
  approvalStatus?: string; // 'APPROVED' | 'PENDING' | 'REJECTED'
}

/** Onboarding status block returned inside /signup, /login, and /api/delivery-app/status */
export interface OnboardingStatus {
  currentStep?: string; // 'ACCOUNT_CREATED' | 'OTP_VERIFIED' | 'PROFILE_COMPLETED' | 'DOCUMENTS_UPLOADED' | 'KYC_UNDER_REVIEW' | 'REJECTED' | 'APPROVED'
  phoneVerified?: boolean;
  personalInfoCompleted?: boolean;
  vehicleCompleted?: boolean;
  bankCompleted?: boolean;
  profilePhotoUploaded?: boolean;
  profilePhotoApproved?: boolean;
  requiredDocumentsUploaded?: boolean;
  requiredDocumentsApproved?: boolean;
  requiredDocuments?: string[];
  optionalDocuments?: string[];
  missingRequiredDocuments?: string[];
  missingApprovedDocuments?: string[];
  documentChecklist?: Record<string, any>;
  readyForFinalApproval?: boolean;
  loginAllowed?: boolean;
  canGoOnline?: boolean;
  completionPercent?: number;
  [key: string]: any;
}

/** Response from POST /api/delivery/auth/signup and POST /api/delivery/auth/login */
export interface DeliveryAuthResponse {
  jwtToken?: string;
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  expiresIn?: number;
  deliveryPersonId: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phoneNumber?: string;
  /** true = admin has fully approved the account */
  isApprovedByAdmin?: boolean;
  approvalStatus?: string;   // 'PENDING' | 'APPROVED' | 'REJECTED'
  isVerified?: boolean;      // phone OTP verified
  profilePhotoUrl?: string;
  profilePhotoStatus?: string; // 'PENDING' | 'APPROVED' | 'REJECTED'
  /** true = photo cannot be changed without admin intervention */
  profilePhotoLocked?: boolean;
  vehicleType?: string;
  vehicleModel?: string;
  registrationNumber?: string;
  onboardingStatus?: OnboardingStatus;
  message?: string;
}
