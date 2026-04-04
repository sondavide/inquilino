# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered tenant verification and landlord matching platform (Italian: "inquilino" = tenant). Tenants create a verified reliability profile via an AI chatbot wizard; landlords search and filter candidates by objective indicators.

**Spec documents** (read before implementing anything):
| File | Purpose |
|------|---------|
| `requisiti.md` | Product vision, user actors, MVP roadmap (3 phases) |
| `descrizione.md` | Data models, API endpoints, scoring system, AI agent behavior, security/GDPR |
| `onboarding.md` | 18-step chatbot wizard: step structure, branching logic, state machine |

## Definitive Tech Stack

### Backend
- **Spring Boot (Java)** + **Spring AI** (LLM abstraction layer)
- **Spring Data JPA** + Hibernate ORM
- **Spring Security OAuth2** — Google, Facebook, LinkedIn login; store `provider`, `provider_user_id`, `profile_url` per user
- **PostgreSQL** — relational model + JSONB for `extracted_data` fields
- **MinIO** via AWS SDK for Java (S3-compatible) — encrypted document storage

### Frontend
- **React + Vite + TypeScript**
- **Tailwind CSS** + **shadcn/ui** components
- **Leaflet + react-leaflet** for maps, **Nominatim** (OSM) for city autocomplete — no Google Maps (WebView incompatible)
- Deployed as SPA (not Next.js) — must work inside a WebView for future Android/iOS apps

### AI
- **GPT-4o-mini** (OpenAI) — conversational chatbot, structured data extraction via JSON schema, Italian language
- **GPT-4o** (OpenAI) — multimodal document verification (quick check: "is this a payslip?", extract basic fields)
- Both called through Spring AI — switching provider requires only config change

### Hosting (development)
- Local machine for now. Future: Hetzner VPS + Docker Compose.

## Architecture

**4 modules** (independent, communicate via REST API):
1. **User Management** — auth, roles (TENANT / LANDLORD), OAuth2 social profiles
2. **AI Onboarding Agent** — 18-step conversational wizard, stateful per user
3. **Document Management** — upload to MinIO, GPT-4o quick verification, OCR extraction
4. **Scoring & Matching** — categorical scores (HIGH/MEDIUM/LOW), tenant-landlord matching

**Onboarding state** (must be persisted, not in-memory):
```
OnboardingState { user_id, current_step, step_status, collected_data, missing_fields, pending_actions }
```

**Data flow — Tenant**: `REGISTER → AI INTERVIEW → DOCUMENT UPLOAD → VALIDATION → SCORING → PROFILE COMPLETE`

## Key Data Models

```
User          { id, type(TENANT|LANDLORD), email, phone, created_at, verified,
                provider, provider_user_id, profile_url }
TenantProfile { user_id, full_name, birth_date, employment_type, monthly_income,
                has_guarantor, profile_completion, verification_status }
Document      { id, user_id, type, file_url, uploaded_at, verified, extracted_data(JSONB) }
Score         { rent_sustainability, income_stability, document_reliability: HIGH|MEDIUM|LOW,
                profile_completeness: 0-100 }
```

## Implementation Constraints

- Scores are always categorical (HIGH/MEDIUM/LOW), never raw numbers — GDPR + anti-discrimination
- Scoring thresholds are in `descrizione.md` — do not invent new ones
- Onboarding wizard branching logic (e.g. employed vs self-employed vs student paths) is in `onboarding.md`
- Every piece of data must be traceable to its source (declared vs document-verified)
- No fully automated final decisions — human control must remain possible
- Leaflet/Nominatim only for maps — no Google Maps JS SDK in WebView context
