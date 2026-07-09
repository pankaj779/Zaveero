# API Standards

Version: 1.0

---

# Objective

This document defines the standards for designing, implementing, documenting, and maintaining REST APIs across the Graphology Platform.

Every API must follow these standards to ensure consistency, maintainability, scalability, and ease of integration.

---

# API Style

The platform will expose RESTful APIs.

Base URL

/api/v1

Future versions

/api/v2

Never break existing APIs.

Introduce breaking changes only through a new API version.

---

# API Design Principles

Every API should be:

- Predictable
- Consistent
- Secure
- Well documented
- Easy to consume
- Backward compatible whenever possible

---

# Resource Naming

Use plural nouns.

Examples

/users

/courses

/students

/teachers

/payments

/assignments

/quizzes

Never use verbs in endpoint names.

Incorrect

/createCourse

/getUsers

Correct

POST /courses

GET /users

---

# HTTP Methods

GET

Retrieve resources.

POST

Create resources.

PUT

Replace an entire resource.

PATCH

Update part of a resource.

DELETE

Soft delete whenever applicable.

---

# Standard Response Format

Success

{
    "success": true,
    "message": "Operation completed successfully.",
    "data": {}
}

---

Failure

{
    "success": false,
    "message": "Validation failed.",
    "errorCode": "VALIDATION_ERROR",
    "errors": []
}

---

# HTTP Status Codes

200 OK

201 Created

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Unprocessable Entity

429 Too Many Requests

500 Internal Server Error

---

# Pagination

Every listing endpoint must support pagination.

Example

GET /courses?page=1&limit=20

Response

{
    "success": true,
    "data": [],
    "pagination": {
        "page": 1,
        "limit": 20,
        "totalItems": 120,
        "totalPages": 6
    }
}

---

# Filtering

Support query parameters.

Examples

GET /courses?level=beginner

GET /students?status=active

GET /payments?status=paid

---

# Sorting

Example

GET /courses?sort=createdAt

Descending

GET /courses?sort=-createdAt

---

# Searching

Example

GET /courses?search=graphology

Search should be case-insensitive whenever practical.

---

# Validation

Validate:

Required fields

Length

Email format

Phone format

Date format

UUID format

File uploads

Business rules

Reject invalid requests.

---

# Authentication

Protected endpoints require JWT authentication.

Public endpoints should be explicitly documented.

---

# Authorization

Every protected endpoint must verify permissions.

Examples

Student

Can access only their own data.

Teacher

Can manage only their own courses and batches.

Admin

Has full access.

---

# Idempotency

POST payment endpoints should support idempotency where applicable.

Prevent duplicate payment processing.

---

# Error Handling

Return meaningful errors.

Example

{
    "success": false,
    "message": "Course not found.",
    "errorCode": "COURSE_NOT_FOUND"
}

Never expose stack traces.

---

# File Upload APIs

Validate:

Extension

MIME Type

File Size

Generate unique filenames.

---

# Date Format

Use ISO 8601.

Example

2026-07-09T10:30:00Z

Always store timestamps in UTC.

Convert to local time in the frontend.

---

# UUID

Every resource ID should be UUID.

Never expose sequential IDs.

---

# API Documentation

Document every endpoint with:

Description

Authentication

Request Body

Response

Validation Rules

Possible Errors

Example Request

Example Response

Swagger should be available in development.

Disable public Swagger access in production unless explicitly required.

---

# Rate Limiting

Apply stricter limits to:

Authentication

Payments

File uploads

Contact forms

Password reset

---

# Logging

Log:

Authentication failures

Payment requests

Server errors

Validation failures

Admin operations

Do not log sensitive data.

---

# Security

All APIs must use HTTPS.

Validate JWT.

Validate permissions.

Sanitize inputs.

Escape outputs where applicable.

Protect against SQL Injection and XSS.

---

# API Versioning

Current Version

v1

Future versions

v2

v3

Older versions should remain supported according to the deprecation policy.

---

# Naming Conventions

JSON fields

camelCase

Examples

firstName

courseTitle

createdAt

Database fields remain snake_case.

---

# Performance

Avoid unnecessary queries.

Implement pagination.

Use indexes.

Avoid returning unnecessary fields.

Support response compression.

---

# Deprecation Policy

Deprecated APIs should:

Remain functional during the deprecation period.

Be documented.

Provide migration guidance.

---

# Final Goal

Every API should be predictable, secure, fast, easy to consume, and consistent across the entire platform.