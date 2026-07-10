# System Architecture

Version: 1.1

> Related: [ADRs](./adr/README.md) · [Tech Stack](./13_TECH_STACK.md) · [API Versioning](./API_VERSIONING.md)

---

# Overview

The Graphology Platform shall be built as a modern, scalable, production-ready Learning Management System (LMS).

The architecture must prioritize maintainability, scalability, security, performance, and developer experience.

The application should follow clean architecture principles and avoid tight coupling between modules.

---

# Architecture Style

The application will use a modular monolithic architecture for Version 1.

This provides:

- Simpler deployment
- Faster development
- Easier debugging
- Lower infrastructure cost

The architecture should remain modular so that individual modules can later be extracted into microservices if business requirements demand it.

---

# Technology Stack

## Frontend

- Next.js (Latest Stable)
- React
- TypeScript
- Tailwind CSS
- Shadcn UI
- React Hook Form
- Zod
- TanStack Query

---

## Backend

- NestJS
- TypeScript
- Prisma ORM

---

## Database

- PostgreSQL
- Neon Database

---

## Authentication

- JWT Authentication
- Refresh Tokens
- Google OAuth
- Email Verification
- Role Based Access Control (RBAC)

---

## Storage

- Cloudinary (Images)
- AWS S3 Compatible Storage (Future)

---

## Payments

- Razorpay

Future:

- Stripe

---

## Email Service

- Resend

---

## Hosting

Frontend

- Vercel

Backend

- Render

Database

- Neon

---

# High Level Architecture

User

↓

Next.js Frontend

↓

NestJS REST API

↓

Prisma ORM

↓

PostgreSQL Database

---

# Multi-Tenant Organization Model

The platform is designed as a multi-organization SaaS LMS from day one.

Version 1 will operate with a single default organization (Graphology Academy), but the data model supports many institutes without schema redesign.

## Tenant Boundary

Organization

↓

OrganizationMember

↓

User

Rules:

- Users are global identity records.
- Users are linked to organizations through `OrganizationMember`.
- A user may belong to multiple organizations.
- Future business entities (courses, batches, payments, certificates, etc.) must include `organizationId`.
- Do not place `organizationId` directly on the `User` table.

## Initial Tenant

Name: Graphology Academy

Slug: graphology-academy

---

# Application Modules

The application should be divided into independent modules.

Authentication

User Management

Organization Management

Course Management

Teacher Management

Student Management

Batch Management

Assignment Module

Quiz Module

Certificate Module

Payment Module

Notification Module

Analytics Module

Blog Module

CRM Module

Settings Module

Audit Log Module

Each module should have its own service, controller, DTOs, validation logic and database models.

---

# Backend Folder Structure

src/

app/

auth/

users/

teachers/

students/

courses/

batches/

assignments/

quizzes/

payments/

notifications/

certificates/

blogs/

analytics/

crm/

audit/

common/

config/

database/

shared/

---

# Frontend Folder Structure

app/

components/

features/

hooks/

services/

types/

lib/

styles/

providers/

utils/

constants/

---

# API Design Principles

The backend must expose REST APIs.

Every endpoint should:

- Validate input
- Return consistent responses
- Use proper HTTP status codes
- Log errors
- Support pagination where required

---

# Database Principles

- UUID primary keys
- Foreign keys
- Soft delete support
- Created At timestamp
- Updated At timestamp
- Indexed search columns
- Normalized design
- Migration based schema management

---

# Security Principles

Every request must pass through:

Authentication

↓

Authorization

↓

Validation

↓

Business Logic

↓

Database

Sensitive information must never be exposed to the client.

---

# Logging

The system must log:

- User logins
- Failed logins
- Payments
- Course purchases
- Assignment submissions
- Admin actions
- Errors
- Exceptions

---

# Error Handling

The application should never expose internal server errors directly.

Return standardized API responses.

Example:

{
  "success": false,
  "message": "Resource not found",
  "errorCode": "RESOURCE_NOT_FOUND"
}

---

# Scalability

The architecture should support:

100 users

↓

1,000 users

↓

10,000 users

↓

100,000+ users

without major architectural redesign.

---

# Coding Philosophy

The system should prioritize:

- Clean Code
- SOLID Principles
- DRY
- KISS
- Separation of Concerns
- Dependency Injection
- Reusable Components

---

# Future Expansion

The architecture should allow future integration with:

- Android App
- iOS App
- AI Services
- WhatsApp API
- SMS Gateway
- Video Streaming
- Marketplace
- Multi-Tenant SaaS
- Franchise Management

without major restructuring.

---

# Final Goal

Build software that is production-ready from the beginning.

The objective is not simply to make the application work.

The objective is to make it maintainable, scalable, secure, testable, and easy to extend for many years.