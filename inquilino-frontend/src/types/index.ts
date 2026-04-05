export enum UserType    { TENANT = 'TENANT', LANDLORD = 'LANDLORD', SUPERVISOR = 'SUPERVISOR', AGENCY = 'AGENCY', SUPERADMIN = 'SUPERADMIN' }
export enum VerificationStatus { NONE = 'NONE', PARTIAL = 'PARTIAL', VERIFIED = 'VERIFIED' }
export enum StepStatus  { NOT_STARTED = 'NOT_STARTED', IN_PROGRESS = 'IN_PROGRESS', COMPLETED = 'COMPLETED', BLOCKED = 'BLOCKED' }
export enum MessageRole { USER = 'USER', ASSISTANT = 'ASSISTANT' }

export interface ChatMessage {
  id:          string
  role:        MessageRole
  content:     string
  createdAt:   string
  isDocument?: boolean
}

export interface Suggestion {
  label: string
  value: string
}

export interface ChecklistItemDto {
  key:       string
  label:     string
  required:  boolean
  collected: boolean
}

export interface OnboardingStateDto {
  currentStep:            string
  stepNumber:             number
  totalSteps:             number
  progress:               number
  stepStatus:             StepStatus
  suggestions:            Suggestion[]
  checklistItems:         ChecklistItemDto[]
  requiresDocumentUpload: boolean
  expectedDocumentTypes:  string[]
  residenceAddress?:      string
}

/**
 * Area of interest selected by the tenant in MapSelector.
 * Sent to backend and also passed as chat message context.
 */
export interface InterestArea {
  /** POLYGON = custom drawn | CITY_BOUNDARY = city OSM boundary | ANYWHERE = no constraint */
  areaType: 'POLYGON' | 'CITY_BOUNDARY' | 'ANYWHERE'
  cityName: string
  /** GeoJSON geometry object — null for ANYWHERE */
  areaGeojson: object | null
}

export interface DocumentUploadResponse {
  documentId:               string
  quickVerificationPassed:  boolean
  verificationNote:         string
  fileUrl:                  string
}

// ─── Tenant profile ───────────────────────────────────────────────────────────

export type ScoreLevel = 'HIGH' | 'MEDIUM' | 'LOW'

export interface ScoreDto {
  rentSustainability:  ScoreLevel
  incomeStability:     ScoreLevel
  documentReliability: ScoreLevel
  profileCompleteness: number
}

export interface DocumentDto {
  id:            string
  type:          string
  fileUrl:       string
  uploadedAt:    string
  verified:      boolean
  extractedData: Record<string, unknown>
}

export interface InterestAreaDto {
  id:          string
  areaType:    'POLYGON' | 'CITY_BOUNDARY' | 'ANYWHERE'
  cityName:    string
  areaGeojson: object | null
}

export interface TenantProfileDto {
  // User
  email: string
  phone: string | null
  // Onboarding
  onboardingCompleted: boolean
  // Profile (may be null fields if onboarding incomplete)
  profileId:            string | null
  fullName:             string | null
  birthDate:            string | null
  birthPlace:           string | null
  residence:            string | null
  fiscalCode:           string | null
  employmentType:       string | null
  monthlyIncome:        number | null
  contractType:         string | null
  employmentStartDate:  string | null
  hasGuarantor:         boolean
  guarantorIncome:      number | null
  maxBudget:            number | null
  moveInDate:           string | null
  occupants:            number | null
  hasPets:              boolean
  smoker:               boolean
  desiredLocations:     Array<Record<string, unknown>> | null
  profileCompletion:    number
  verificationStatus:   'NONE' | 'PARTIAL' | 'VERIFIED'
  active:               boolean
  // Score
  score:        ScoreDto
  // Documents
  documents:    DocumentDto[]
  // Interest areas
  interestAreas: InterestAreaDto[]
}
