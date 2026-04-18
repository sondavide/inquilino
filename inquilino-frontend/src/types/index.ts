export enum UserType    { TENANT = 'TENANT', LANDLORD = 'LANDLORD', SUPERVISOR = 'SUPERVISOR', AGENCY = 'AGENCY', AGENCY_OPERATOR = 'AGENCY_OPERATOR', SUPERADMIN = 'SUPERADMIN' }
export enum VerificationStatus {
  NONE = 'NONE',
  PARTIAL = 'PARTIAL',
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  IN_VALIDATION = 'IN_VALIDATION',
  NEEDS_CORRECTION = 'NEEDS_CORRECTION',
  VERIFIED = 'VERIFIED'
}
export enum FieldValidationStatus { PENDING = 'PENDING', APPROVED = 'APPROVED', FLAGGED = 'FLAGGED' }
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
  verificationStatus:   'NONE' | 'PARTIAL' | 'PENDING_VALIDATION' | 'IN_VALIDATION' | 'NEEDS_CORRECTION' | 'VERIFIED'
  active:               boolean
  // Score
  score:        ScoreDto
  // Documents
  documents:    DocumentDto[]
  // Interest areas
  interestAreas: InterestAreaDto[]
}

// ─── Supervisor types ─────────────────────────────────────────────────────────

export interface FieldValidationDto {
  id:            string
  fieldName:     string
  status:        'PENDING' | 'APPROVED' | 'FLAGGED'
  note:          string | null
  verifiedValue: string | null
  supervisorId:  string | null
  validatedAt:   string
  correctedAt:   string | null
}

// ─── Guarantor ────────────────────────────────────────────────────────────────

export interface GuarantorDto {
  id:                   string
  tenantProfileId:      string
  roleLabel:            string | null
  fullName:             string | null
  fiscalCode:           string | null
  employmentType:       string | null
  contractType:         string | null
  employmentStartDate:  string | null
  employmentEndDate:    string | null
  declaredMonthlyIncome: number | null
  verifiedMonthlyIncome: number | null
  incomeVerified:        boolean
  enteredByRole:         string | null
  createdAt:             string | null
}

export interface GuarantorRequest {
  roleLabel?:           string | null
  fullName?:            string | null
  fiscalCode?:          string | null
  employmentType?:      string | null
  contractType?:        string | null
  employmentStartDate?: string | null
  employmentEndDate?:   string | null
  declaredMonthlyIncome?: number | null
}

// ─── Supervisor notes ─────────────────────────────────────────────────────────

export interface SupervisorNoteDto {
  id:               string
  tenantProfileId:  string
  supervisorId:     string
  message:          string
  requestedItems:   string[]
  status:           'PENDING' | 'REPLIED' | 'RESOLVED'
  sentAt:           string
  tenantRepliedAt:  string | null
  resolvedAt:       string | null
}

// ─── Score breakdown ──────────────────────────────────────────────────────────

export interface ScoreBreakdownDto {
  rent:   RentBreakdown
  income: IncomeBreakdown
  docs:   DocBreakdown
  overrideRentSustainability:  ScoreLevel | null
  overrideIncomeStability:     ScoreLevel | null
  overrideDocumentReliability: ScoreLevel | null
  overrideReason:              string | null
  profileCompletion:           number
  suggestions:                 ScoreSuggestion[]
}

export interface RentBreakdown {
  declaredIncome:      number | null
  verifiedIncome:      number | null
  incomeUsed:          number | null
  guarantorTotalIncome: number | null
  guarantorCredit:     number | null
  effectiveIncome:     number | null
  maxBudget:           number | null
  ratioPercent:        number | null
  level:               ScoreLevel
  explanation:         string
}

export interface IncomeBreakdown {
  employmentType: string | null
  contractType:   string | null
  factorA:        number
  factorAExplanation: string
  factorB:        number
  factorBExplanation: string
  factorC:        number
  factorCExplanation: string
  factorD:        number
  factorDExplanation: string
  totalScore:     number
  level:          ScoreLevel
  isStudent:      boolean
  familyScore:    number | null
  familyScoreA:   number | null
  familyScoreB:   number | null
  familyScoreC:   number | null
  familyScoreD:   number | null
  familyExplanation: string | null
  combinedScore:  number | null
  studentWeightPct: number | null
  familyWeightPct:  number | null
}

export interface DocBreakdown {
  lines:       DocLine[]
  totalScore:  number
  level:       ScoreLevel
  explanation: string
}

export interface DocLine {
  type:        string
  count:       number
  approved:    boolean
  pointsEarned: number
  maxPoints:   number
  isBonus:     boolean
}

export interface ScoreSuggestion {
  category:           string
  action:             string
  projectedLevel:     ScoreLevel | null
  estimatedPointGain: number | null
  documentType?:      string | null
}

export interface SupervisorProfileSummary {
  profileId:            string
  userId:               string
  email:                string
  fullName:             string | null
  verificationStatus:   string
  profileCompletion:    number
  assignedSupervisorId: string | null
}

export interface SupervisorProfileDetail {
  profileId:            string
  userId:               string
  email:                string
  phone:                string
  fullName:             string
  birthDate:            string
  birthPlace:           string
  residence:            string
  fiscalCode:           string
  employmentType:       string
  monthlyIncome:        number | null
  contractType:         string
  employmentStartDate:  string
  employmentEndDate:    string
  hasGuarantor:         boolean
  guarantorIncome:      number | null
  maxBudget:            number | null
  moveInDate:           string
  occupants:            number | null
  hasPets:              boolean
  smoker:               boolean
  verificationStatus:   string
  profileCompletion:    number
  assignedSupervisorId: string
  scoringTemplateId:    string | null
  score:                ScoreDetailDto | null
}

export interface SupervisorDocumentDto {
  id:            string
  type:          string
  uploadedAt:    string
  verified:      boolean
  extractedData: Record<string, unknown>
}

export interface ChatMessageDto {
  id:        string
  role:      'USER' | 'ASSISTANT'
  content:   string
  step:      string
  createdAt: string
}

export interface ScoreDetailDto {
  // Algorithm
  algoRentSustainability:            ScoreLevel
  algoRentSustainabilityExplanation: string
  algoIncomeStability:               ScoreLevel
  algoIncomeStabilityExplanation:    string
  algoDocumentReliability:           ScoreLevel
  algoDocumentReliabilityExplanation:string
  algoProfileCompleteness:           number
  // Override (null = not set)
  overrideRentSustainability:        ScoreLevel | null
  overrideIncomeStability:           ScoreLevel | null
  overrideDocumentReliability:       ScoreLevel | null
  overrideReason:                    string | null
  // Effective
  rentSustainability:                ScoreLevel
  incomeStability:                   ScoreLevel
  documentReliability:               ScoreLevel
}

export interface ScoreOverrideRequest {
  rentSustainability:    ScoreLevel | null
  incomeStability:       ScoreLevel | null
  documentReliability:   ScoreLevel | null
  reason:                string | null
}

export interface ScoringTemplate {
  id:                 string
  name:               string
  description:        string | null
  // Pesi forza-tenant (matching)
  weightIdentity:     number
  weightIncome:       number
  weightStability:    number
  weightDocuments:    number
  weightGuarantor:    number
  // Pesi per tipo documento
  docWeightIdentity:              number
  docWeightPayslip:               number
  docWeightPayslipTripleBonus:    number
  docWeightTaxReturn:             number
  docWeightEmploymentContract:    number
  docWeightBankStatement:         number
  docWeightLandlordReference:     number
  docWeightGuarantorDocument:     number
  // Soglie document_reliability
  docReliabilityHighThreshold:    number
  docReliabilityMediumThreshold:  number
  // Soglie income_stability
  stabilityHighThreshold:         number
  stabilityMediumThreshold:       number
  studentFamilyWeightPct:         number
  // Soglie rent_sustainability
  rentHighThresholdPct:           number
  rentMediumThresholdPct:         number
  guarantorIncomeCreditPct:       number
  isDefault:          boolean
  createdAt:          string
  updatedAt:          string
  linkedProfileCount: number
}

export interface OnboardingStateInfo {
  currentStep:        string
  stepNumber:         number
  totalSteps:         number
  onboardingCompleted: boolean
}

// ─── Notification types ───────────────────────────────────────────────────────

export interface AppNotification {
  id:        string
  userId:    string
  type:      string
  title:     string
  message:   string
  read:      boolean
  createdAt: string
}

// ─── Admin types ──────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id:               string
  tenantProfileId:  string
  actorId:          string
  actorType:        string
  action:           string
  fieldName:        string | null
  oldValue:         string | null
  newValue:         string | null
  note:             string | null
  createdAt:        string
}

export interface SupervisorUser {
  id:    string
  email: string
  phone: string
}

export interface FiscalCodeAnalysis {
  fiscalCode:              string
  checksumValid:           boolean
  inferredGender:          'M' | 'F'
  birthYearMatch:          boolean
  birthMonthMatch:         boolean
  birthDayMatch:           boolean
  extractedBelfioreCode:   string
  cfSurnameCode:           string
  cfNameCode:              string
  calculatedSurnameCode:   string
  calculatedNameCode:      string
  surnameCodeMatch:        boolean
  nameCodeMatch:           boolean
}

// ─── Listing (annunci immobiliari) ────────────────────────────────────────────

export type ListingStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED' | 'SUSPENDED'
export type ListingType   = 'LONG_TERM_RENT' | 'SHORT_TERM_RENT' | 'TRANSITIONAL_RENT' | 'STUDENT_RENT' | 'ROOM_RENT'
export type PropertyType  = 'APARTMENT' | 'STUDIO' | 'LOFT' | 'PENTHOUSE' | 'HOUSE' | 'VILLA' | 'ROOM' | 'BED_IN_SHARED_ROOM' | 'OFFICE' | 'SHOP' | 'WAREHOUSE' | 'GARAGE' | 'BUILDING' | 'OTHER'
export type PublisherType = 'PRIVATE' | 'AGENCY' | 'BUILDER' | 'PROPERTY_MANAGER'
export type LocationPrecision = 'EXACT' | 'APPROXIMATE' | 'HIDDEN'
export type EnergyClass   = 'A4' | 'A3' | 'A2' | 'A1' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'NA'

export interface ListingLocationData {
  countryCode:       string
  region:            string
  province:          string
  municipality:      string
  district?:         string
  postalCode?:       string
  streetName?:       string
  streetNumber?:     string
  fullAddress?:      string
  locationPrecision: LocationPrecision
  lat:               number
  lng:               number
  displayLat?:       number
  displayLng?:       number
  geocodingProvider?: string
  placeId?:          string
}

export interface ListingPriceData {
  currency:                    string
  monthlyRent?:                number
  weeklyRent?:                 number
  dailyRent?:                  number
  condominiumFees?:            number
  utilitiesIncluded:           boolean
  utilitiesEstimatedMonthly?:  number
  depositMonths?:              number
  depositAmount?:              number
  agencyFeeAmount?:            number
  agencyFeeNotes?:             string
  otherCostsNotes?:            string
  priceVisibility:             string
}

export interface ListingFeaturesData {
  surfaceSqm?:          number
  commercialSurfaceSqm?: number
  roomsCount?:          number
  bedroomsCount?:       number
  bathroomsCount?:      number
  floorNumber?:         number
  totalBuildingFloors?: number
  elevator:             boolean
  parkingSpacesCount:   number
  garageIncluded:       boolean
  balconiesCount:       number
  terracesCount:        number
  cellarsCount:         number
  // Room-specific
  roomType?:            string
  roomSurfaceSqm?:      number
  roomFurnished?:       boolean
  privateBathroom?:     boolean
  sharedBathroom?:      boolean
  sharedKitchen?:       boolean
  roommatesCount?:      number
  studentsOnly:         boolean
  // Amenities
  amenities:            Record<string, boolean>
}

export interface ListingAvailabilityData {
  conditionStatus?:                string
  furnishedStatus?:                string
  kitchenStatus?:                  string
  heatingType?:                    string
  coolingType?:                    string
  availabilityStatus?:             string
  availableFrom?:                  string
  availableTo?:                    string
  minimumContractDurationMonths?:  number
  maximumContractDurationMonths?:  number
  minimumStayDays?:                number
  maximumStayDays?:                number
  maxOccupants?:                   number
  petsAllowed:                     boolean
  smokingAllowed:                  boolean
  childrenAllowed:                 boolean
  sublettingAllowed:               boolean
  residenceAllowed:                boolean
  studentsAllowed:                 boolean
  workersAllowed:                  boolean
  shortStayAllowed:                boolean
  notesForTenants?:                string
}

export interface ListingEnergyData {
  energyClass?:                   EnergyClass
  energyIndexEpgl?:               number
  energyCertificateAvailable:     boolean
  energyCertificateFileUrl?:      string
  heatingEnergySource?:           string
  renewableEnergyPresent:         boolean
}

export interface ListingMediaItem {
  id:          string
  mediaType:   string
  fileUrl:     string
  sortOrder:   number
  isCover:     boolean
  uploadedAt:  string
}

export interface ListingPublisherData {
  publisherType?:  string
  displayName?:    string
  agencyName?:     string
  vatNumber?:      string
  reaNumber?:      string
  contactMode?:    string
  contactPhone?:   string
  contactEmail?:   string
  websiteUrl?:     string
}

export interface ListingFieldValidation {
  id:           string
  listingId:    string
  fieldName:    string
  status:       'PENDING' | 'APPROVED' | 'FLAGGED'
  note:         string | null
  supervisorId: string | null
  validatedAt:  string
  correctedAt:  string | null
}

export interface ListingDto {
  id:                string
  listingType:       ListingType
  propertyType:      PropertyType
  publisherType:     PublisherType
  status:            ListingStatus
  title:             string | null
  description:       string | null
  titleEn:           string | null
  descriptionEn:     string | null
  sourceLang:        string | null
  internalReference: string | null
  slug:              string | null
  createdAt:         string
  updatedAt:         string
  publishedAt:       string | null
  location:          ListingLocationData | null
  price:             ListingPriceData | null
  features:          ListingFeaturesData | null
  availability:      ListingAvailabilityData | null
  energy:            ListingEnergyData | null
  media:             ListingMediaItem[]
  publisher:         ListingPublisherData | null
  validations:       ListingFieldValidation[]
}

export interface PagedResponse<T> {
  content:          T[]
  totalElements:    number
  totalPages:       number
  number:           number   // current page (0-based)
  size:             number
}

export interface ListingSummary {
  id:              string
  listingType:     ListingType
  propertyType:    PropertyType
  status:          ListingStatus
  title:           string | null
  municipality:    string | null
  district:        string | null
  monthlyRent:     number | null
  surfaceSqm:      number | null
  roomsCount:      number | null
  coverImageUrl:   string | null
  createdAt:       string
  updatedAt:       string
  mediaCount:         number
  flaggedFieldsCount: number
  mutualMatchCount:   number
}

export interface SaveListingRequest {
  listingType?:      string
  propertyType?:     string
  publisherType?:    string
  title?:            string
  description?:      string
  internalReference?: string
  sourceLang?:       string
  location?:         ListingLocationData
  price?:            ListingPriceData
  features?:         ListingFeaturesData
  availability?:     ListingAvailabilityData
  energy?:           ListingEnergyData
  publisher?:        ListingPublisherData
}

// ─── Matching ─────────────────────────────────────────────────────────────────

export type MatchState = 'ALGORITHMIC' | 'TENANT_INTERESTED' | 'LANDLORD_INTERESTED' | 'MUTUAL_INTEREST' | 'CONTACT_UNLOCKED' | 'ARCHIVED'
export type MatchBand  = 'EXCELLENT_MATCH' | 'GOOD_MATCH' | 'MEDIUM_MATCH' | 'WEAK_MATCH'

/** Vista di un annuncio per l'inquilino (privacy-aware). */
export interface ListingCardDto {
  matchId:            string
  matchState:         MatchState
  matchBand:          MatchBand | null
  matchScore:         number

  priceCompatible:    boolean
  areaCompatible:     boolean
  timingCompatible:   boolean

  listingId:          string
  listingType:        string
  propertyType:       string
  title:              string | null

  streetName:         string | null
  district:           string | null
  municipality:       string | null
  displayLat:         number | null
  displayLng:         number | null

  // Solo in CONTACT_UNLOCKED
  exactLat:           number | null
  exactLng:           number | null
  fullAddress:        string | null

  // ─── Prezzo ───────────────────────────────────────────────────────────────
  monthlyRent:               number | null
  dailyRent:                 number | null
  condominiumFees:           number | null
  utilitiesIncluded:         boolean
  utilitiesEstimatedMonthly: number | null
  depositMonths:             number | null
  depositAmount:             number | null
  agencyFeeAmount:           number | null
  agencyFeeNotes:            string | null

  // ─── Caratteristiche ──────────────────────────────────────────────────────
  surfaceSqm:              number | null
  commercialSurfaceSqm:    number | null
  roomsCount:              number | null
  bedroomsCount:           number | null
  bathroomsCount:          number | null
  floorNumber:             number | null
  totalBuildingFloors:     number | null
  elevator:                boolean
  parkingSpacesCount:      number
  garageIncluded:          boolean
  balconiesCount:          number
  terracesCount:           number
  cellarsCount:            number

  // Room-specific
  roomType:          string | null
  roomSurfaceSqm:    number | null
  privateBathroom:   boolean | null
  sharedBathroom:    boolean | null
  sharedKitchen:     boolean | null
  roommatesCount:    number | null
  studentsOnly:      boolean

  // ─── Stato / dotazioni ────────────────────────────────────────────────────
  conditionStatus:   string | null
  furnishedStatus:   string | null
  kitchenStatus:     string | null
  heatingType:       string | null
  coolingType:       string | null
  amenities:         Record<string, boolean>

  // ─── Disponibilità ────────────────────────────────────────────────────────
  availabilityStatus:               string | null
  availableFrom:                    string | null
  availableTo:                      string | null
  minimumContractDurationMonths:    number | null
  maximumContractDurationMonths:    number | null
  minimumStayDays:                  number | null
  maximumStayDays:                  number | null
  maxOccupants:                     number | null
  petsAllowed:                      boolean
  smokingAllowed:                   boolean
  childrenAllowed:                  boolean
  sublettingAllowed:                boolean
  residenceAllowed:                 boolean
  studentsAllowed:                  boolean
  workersAllowed:                   boolean
  notesForTenants:                  string | null

  // ─── Energia ──────────────────────────────────────────────────────────────
  energyClass:                 string | null
  energyIndexEpgl:             number | null
  energyCertificateAvailable:  boolean
  heatingEnergySource:         string | null
  renewableEnergyPresent:      boolean

  coverImageUrl:      string | null
  allImageUrls:       string[]
  description:        string | null

  matchSummary:       string | null
  tenantMatchSummary: string | null

  // Solo in CONTACT_UNLOCKED
  landlordDisplayName:   string | null
  landlordContactPhone:  string | null
  landlordContactEmail:  string | null
}

/** Vista anonimizzata di un profilo tenant per il locatore. */
export interface TenantProfileCardDto {
  matchId:              string
  matchState:           MatchState
  matchBand:            MatchBand | null
  matchScore:           number

  profileCode:          string
  ageRange:             string | null
  occupationCategory:   string | null
  incomeRange:          string | null
  occupants:            number
  hasPets:              boolean
  smoker:               boolean
  hasGuarantor:         boolean

  budgetCompliance:     string | null
  moveInDate:           string | null

  rentSustainability:   ScoreLevel
  incomeStability:      ScoreLevel
  documentReliability:  ScoreLevel
  profileCompletion:    number
  verificationStatus:   string

  profileSummary:       string | null
  matchSummary:         string | null
  recommendation:       string | null

  // Solo in CONTACT_UNLOCKED
  fullName:   string | null
  email:      string | null
  phone:      string | null
}

// ─── Agency types ─────────────────────────────────────────────────────────────

export type AgencyStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED'

export interface AgencyArea {
  type: 'COMUNE' | 'PROVINCIA' | 'REGIONE'
  name: string
  osmId?: string
  osmType?: string   // 'node' | 'way' | 'relation'
  displayName: string
  boundingBox?: number[]
}

export interface AgencyProfileDto {
  id:           string
  userId:       string
  agencyName:   string
  vatNumber:    string | null
  reaNumber:    string | null
  websiteUrl:   string | null
  contactEmail: string | null
  contactPhone: string | null
  status:       AgencyStatus
  statusNote:   string | null
  areas:        AgencyArea[]
  createdAt:    string
  approvedAt:   string | null
}

export interface AgencyProfileSummary {
  id:           string
  userId:       string
  agencyName:   string
  vatNumber:    string | null
  contactEmail: string | null
  status:       AgencyStatus
  statusNote:   string | null
  createdAt:    string
  approvedAt:   string | null
}

export interface AgencyMembershipDto {
  id:                string
  operatorUserId:    string
  operatorEmail:     string
  operatorDisplayName: string
  listingScope:      string[] | null
  addedAt:           string
}

export interface LandlordProfile {
  id:              string
  userId:          string
  phone:           string | null
  displayName:     string | null
  agencyName:      string | null
  vatNumber:       string | null
  reaNumber:       string | null
  websiteUrl:      string | null
  contactMode:     string
  contactPhone:    string | null
  contactEmail:    string | null
  profileCompletion: number
}
