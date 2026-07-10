# Coding Standards

Version: 1.1

> Related: [ADRs](./adr/README.md) · [Implementation Rules](./prompts/IMPLEMENTATION_RULES.md) · [API Standards](./07_API_STANDARDS.md)

---

# Objective

This document defines the engineering standards that every part of the application must follow.

The goal is to produce production-ready, maintainable, secure and scalable software.

Code should always be written for humans first and computers second.

---

# General Principles

Always prioritize:

- Readability
- Simplicity
- Maintainability
- Reusability
- Performance
- Security
- Testability

Avoid clever code.

Prefer clean code.

---

# Core Engineering Principles

The project must follow:

- SOLID Principles
- DRY (Don't Repeat Yourself)
- KISS (Keep It Simple)
- Separation of Concerns
- Dependency Injection
- Composition over Inheritance
- Clean Architecture

---

# Programming Language

Frontend

- TypeScript

Backend

- TypeScript

Avoid JavaScript wherever possible.

Strict TypeScript mode should always remain enabled.

---

# Naming Conventions

Folders

kebab-case

Example

course-management

---

Files

kebab-case

Examples

course.service.ts

course.controller.ts

course.repository.ts

create-course.dto.ts

---

Variables

camelCase

Example

studentCount

coursePrice

---

Functions

camelCase

Example

createCourse()

calculateDiscount()

---

Classes

PascalCase

Example

CourseService

PaymentController

CreateUserDto

---

Interfaces

Prefix with I only when it improves clarity; otherwise use descriptive names.

Example

PaymentProvider

EmailSender

---

Enums

PascalCase

Example

UserRole

PaymentStatus

CourseLevel

---

Constants

UPPER_SNAKE_CASE

Example

MAX_FILE_SIZE

DEFAULT_PAGE_SIZE

JWT_EXPIRATION

---

# Folder Structure

Every feature should follow this structure.

feature/

controller/

service/

repository/

dto/

entities/

validators/

types/

tests/

---

# Function Guidelines

Functions should:

Have one responsibility.

Be easy to understand.

Remain under approximately 40 lines when practical.

Avoid deep nesting.

Avoid duplicate logic.

---

# Comments

Write self-explanatory code.

Use comments only when necessary.

Do not explain obvious code.

Explain business rules when required.

---

# Error Handling

Never ignore exceptions.

Every error should be:

Logged

Handled gracefully

Returned with meaningful messages

Never expose internal implementation details.

---

# Validation

Validate every request.

Validate:

Input

Files

Authentication

Authorization

Business Rules

Never trust client input.

---

# Logging

Log:

Authentication events

Payments

Admin actions

Critical errors

System failures

Do not log passwords, tokens or sensitive personal data.

---

# API Responses

Always return a consistent structure.

Success

{
  "success": true,
  "message": "...",
  "data": {}
}

Failure

{
  "success": false,
  "message": "...",
  "errorCode": "..."
}

---

# Database

Use Prisma ORM.

Never write raw SQL unless absolutely necessary.

Always use migrations.

Always use transactions for multi-step operations.

Never duplicate data unnecessarily.

---

# Authentication

Passwords must be hashed.

JWT must expire.

Refresh tokens should be stored securely.

Every protected endpoint requires authorization.

---

# File Uploads

Validate:

File type

File size

Allowed extensions

Reject executable files.

---

# Frontend Standards

Use reusable components.

Avoid duplicated UI.

Keep business logic out of components where possible.

Use custom hooks for reusable logic.

Keep components focused on presentation.

---

# Backend Standards

Controllers

Receive requests.

Validate input.

Delegate to services.

Return responses.

Business logic belongs in services.

Repositories handle data access.

---

# Git Standards

Branch names

feature/course-management

bugfix/payment

hotfix/login

release/v1.0.0

Commit messages

feat:

fix:

refactor:

docs:

test:

style:

chore:

Example

feat: add student enrollment module

---

# Testing Standards

Every important feature should include:

Unit tests

Integration tests

End-to-end tests

Critical business logic must always be tested.

---

# Performance

Avoid unnecessary database queries.

Use pagination.

Use lazy loading where appropriate.

Avoid unnecessary re-renders.

Optimize images.

Cache expensive operations where appropriate.

---

# Security

Validate everything.

Escape output.

Prevent SQL Injection.

Prevent XSS.

Prevent CSRF where applicable.

Rate limit APIs.

Use HTTPS only.

Never expose secrets.

---

# Documentation

Public modules should include documentation.

Complex business logic should include concise explanations.

API endpoints should be documented.

---

# Code Review Checklist

Before merging code ensure:

✓ No TypeScript errors

✓ No lint errors

✓ No failing tests

✓ No duplicated logic

✓ Validation exists

✓ Error handling exists

✓ Authorization exists

✓ Documentation updated

✓ Performance considered

✓ Security considered

---

# Final Philosophy

Every file committed to the repository should be considered production code.

Never write temporary solutions that create long-term technical debt.

Build software that another engineer can understand, maintain and extend years later.