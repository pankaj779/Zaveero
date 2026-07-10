# Database Schema

Version: 1.1

> **Source of truth:** [`packages/database/prisma/schema.prisma`](../packages/database/prisma/schema.prisma)  
> Ops guide: [`packages/database/README.md`](../packages/database/README.md) · ADR: [ADR-002 Prisma](./adr/002-prisma.md)

This document describes the intended domain model. Where it conflicts with Prisma, **Prisma wins**.

---

# Database Overview

The application uses PostgreSQL as the primary relational database.

The schema must follow normalization principles, maintain referential integrity, and be optimized for scalability and performance.

Every table should use UUID as the primary key.

Every table must contain:

- id
- created_at
- updated_at

Soft delete will be added where appropriate using:

- deleted_at

---

# Naming Convention

Tables:

snake_case

Examples

users

courses

course_modules

assignments

quiz_attempts

Columns:

snake_case

Foreign Keys:

<entity>_id

Examples

student_id

teacher_id

course_id

batch_id

---

# Core Entities

## Organizations

Stores multi-tenant institute / academy records.

Columns

- id
- name
- slug
- logo
- website
- email
- phone
- address
- timezone
- currency
- language
- is_active
- created_at
- updated_at

---

## Organization Members

Many-to-many membership between users and organizations.

Columns

- id
- organization_id
- user_id
- joined_at
- status

A user may belong to multiple organizations.

Do not store organization_id directly on users.

---

## Users

Stores authentication and profile information.

Columns

- id
- first_name
- last_name
- email
- password_hash
- phone
- profile_image
- role_id
- email_verified
- status
- last_login
- created_at
- updated_at

---

## Roles

Examples

Admin

Teacher

Student

Columns

- id
- name
- description
- created_at
- updated_at

---

## Teachers

Columns

- id
- user_id
- biography
- experience
- specialization
- qualification
- created_at
- updated_at

---

## Students

Columns

- id
- user_id
- date_of_birth
- gender
- address
- emergency_contact
- created_at
- updated_at

---

## Courses

Columns

- id
- teacher_id
- title
- slug
- short_description
- description
- thumbnail
- difficulty
- duration
- language
- price
- discount_price
- published
- created_at
- updated_at

---

## Course Modules

Columns

- id
- course_id
- title
- description
- display_order

---

## Lessons

Columns

- id
- module_id
- title
- description
- video_url
- pdf_url
- duration
- display_order

---

## Batches

Columns

- id
- course_id
- teacher_id
- batch_name
- start_date
- end_date
- meeting_link
- max_students
- status

---

## Enrollments

Columns

- id
- student_id
- course_id
- batch_id
- payment_status
- enrollment_date

---

## Assignments

Columns

- id
- batch_id
- title
- description
- due_date
- total_marks

---

## Assignment Submissions

Columns

- id
- assignment_id
- student_id
- submission_url
- marks
- feedback
- submitted_at

---

## Quizzes

Columns

- id
- batch_id
- title
- total_marks
- passing_marks
- duration

---

## Questions

Columns

- id
- quiz_id
- question
- option_a
- option_b
- option_c
- option_d
- correct_option
- marks

---

## Quiz Attempts

Columns

- id
- quiz_id
- student_id
- score
- started_at
- completed_at

---

## Attendance

Columns

- id
- batch_id
- student_id
- attendance_date
- status

---

## Certificates

Columns

- id
- student_id
- course_id
- certificate_number
- certificate_url
- issued_at

---

## Payments

Columns

- id
- student_id
- amount
- currency
- payment_provider
- payment_reference
- payment_status
- paid_at

---

## Coupons

Columns

- id
- code
- type
- value
- expiry_date
- usage_limit
- active

---

## Blogs

Columns

- id
- title
- slug
- content
- featured_image
- published

---

## Testimonials

Columns

- id
- student_id
- rating
- review
- approved

---

## Contact Requests

Columns

- id
- name
- email
- phone
- message
- status

---

## Notifications

Columns

- id
- user_id
- title
- message
- type
- read
- sent_at

---

## Audit Logs

Columns

- id
- user_id
- action
- entity
- entity_id
- ip_address
- created_at

---

# Relationships

Organization

↓

OrganizationMember

↓

User

↓

Role

Teacher

↓

Courses

Course

↓

Modules

↓

Lessons

Course

↓

Batch

↓

Enrollment

↓

Student

↓

Assignments

↓

Submissions

↓

Quiz

↓

Attempts

↓

Certificate

---

# Indexing Strategy

Create indexes on

- email
- slug
- payment_reference
- certificate_number
- course_id
- teacher_id
- batch_id
- student_id

---

# Authentication Token Tables (implemented)

These tables exist in Prisma and store **hashes only** (never raw tokens).

## refresh_tokens

- id, user_id, token_hash (unique), expires_at, revoked_at, replaced_by_token_id, created_at

## email_verification_tokens

- id, user_id, token_hash, expires_at, created_at

## password_reset_tokens

- id, user_id, token_hash, expires_at, used_at, created_at

---

# Database Standards

- UUID Primary Keys
- Foreign Key Constraints
- NOT NULL where applicable
- Soft Deletes where applicable
- Indexed Search Fields
- Timestamp Columns
- Prisma Migrations
- Transaction Support
- Optimistic Locking (Future)

---

# Future Tables

- AI Analysis
- Student Notes
- Discussion Forum
- Parent Accounts
- Referral System
- Subscription Plans
- Video Progress
- Franchise Management
- Institute Management

---

# Database Goal

The database must be highly normalized, easy to maintain, performant, and capable of supporting future platform growth without significant redesign.