Graphology Platform — Product Requirements
1. Product Overview
Core

The platform is a web-based Learning Management System (LMS) for graphology education. It provides course management, live classes, assignments, quizzes, certificates, payments, notifications, and student management in a single application.

2. User Roles
3 Roles

Role

	

Access




Student

	

Learning features only




Teacher

	

Teaching and batch management




Admin

	

Full platform control

3. Authentication Requirements
Security

Email registration

Google login

Secure password hashing

Forgot password flow

Email verification

Role-based access control

JWT authentication

Session management

4. Student Features
MVP
Students must be able to:

Create an account

Browse courses

View course details

Purchase courses

Join batches

Attend live classes

Access recorded sessions

Download study materials

Submit assignments

Take quizzes

View results

Track attendance

Download certificates

Receive notifications

Contact support

5. Teacher Features
MVP
Teachers must be able to:

Create and edit courses

Upload thumbnails

Define curriculum

Create batches

Schedule classes

Generate Google Meet links

Upload notes and PDFs

Create assignments

Create quizzes

Grade submissions

Mark attendance

Send announcements

View student progress

6. Admin Features
Critical
Admins must be able to:

Manage all users

Add or remove teachers

Approve courses

Manage payments

Create coupons

View analytics

Manage blogs

Manage testimonials

Send notifications

Handle refunds

View audit logs

Configure platform settings

7. Payment Requirements
Razorpay
Supported payment methods:

UPI

Debit cards

Credit cards

Net banking

Wallets

Payment features:

One-time purchase

Coupon codes

Discount support

Payment verification

Invoice generation

Refund tracking

8. Live Class Requirements
Integration
The system should support:

Google Meet integration

Automatic meeting link generation

Class reminders

Attendance tracking

Recording links

Calendar invitations

9. Assignment Module
Learning
Teachers can:

Create assignments

Set deadlines

Upload instructions

Grade submissions

Add feedback

Students can:

Upload PDF

Upload images

View grades

View feedback

10. Quiz Module
Assessment
Features:

MCQ questions

Timer

Automatic evaluation

Pass/fail criteria

Instant results

Leaderboard

11. Certificate Module
Automation
Features:

Automatic PDF generation

Unique certificate ID

QR verification

Download history

12. Notification System
Multi-channel
Channels:

Email

SMS (future)

WhatsApp (future)

Push notifications (future)

Triggers:

Enrollment successful

Upcoming class

Assignment due

Quiz available

Payment successful

Certificate generated

13. Content Management
CMS
Admin should manage:

Blogs

FAQs

Testimonials

Gallery images

Gallery videos

Landing page content

14. Analytics Dashboard
Insights
Metrics:

Total revenue

Monthly revenue

New students

Active students

Course sales

Attendance rate

Completion rate

Popular courses

15. Security Requirements
Mandatory

HTTPS only

Password hashing

JWT validation

Rate limiting

Input validation

File upload validation

CSRF protection

XSS protection

SQL injection protection

Audit logging

16. Performance Requirements
Targets

Requirement

	

Target




Initial page load

	

< 3 seconds




API response

	

< 500 ms




Mobile responsive

	

100%




Lighthouse score

	

90

17. MVP Scope
Launch
The first production release must include:

User authentication

Course listing

Course enrollment

Student dashboard

Teacher dashboard

Admin dashboard

Live class scheduling

Assignments

Basic quizzes

Razorpay integration

Email notifications

Certificate generation

Responsive design

Production deployment

18. Post-MVP Features
Future

Mobile application

AI handwriting analysis

Subscription plans

Referral system

Multi-language support

Advanced analytics

Parent dashboard

Community forum

Teacher marketplace