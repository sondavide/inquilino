export enum UserType    { TENANT = 'TENANT', LANDLORD = 'LANDLORD' }
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
