#### POFT 
Process Operations & Finance Tracker is a production grade full stack but backend focused system built to manage project execution, financial approvals, and operational accountability within an organization. It enforces strict domain rules, role-based workflows, and concurrency-safe approvals, reflecting how real enterprise systems are designed and maintained.

This project is being refactored, optimized and extended continously, to demonstrate good backend engineering practices, not just CRUD APIs.

### Why POFT Exists

Most internal tools fail not because of missing features, but because they:

- Allow invalid state transitions
- Break under concurrent actions
- Lack proper approval controls
- Have weak auditability

POFT was designed and being optimized to solve those exact problems and more as they come up.


### Core Capabilities
## 1. Role‑Based Access Control (RBAC)

POFT supports clearly defined roles with enforced permissions:

Super Admin – system-level oversight and approvals
Project Manager (PM) – project execution and task oversight
Other operational roles (extensible)

Every endpoint is protected with role and permission checks.

## 2. Project & Task Management
Create and manage projects
Assign tasks with clear ownership
Track task lifecycle and completion status
Enforce project-level constraints

The system ensures tasks cannot move into invalid states.

## 3  Financial Approval Workflow (Concurrency‑Safe)

This is a key engineering highlight of POFT.

Financial requests require explicit approval
Approval logic is transactional and concurrency-safe
Prevents double-approval and race conditions
Enforces one-way irreversible state transitions

This mirrors real-world financial systems where correctness matters more than speed.

## 4. Operational Metrics & KPIs
Track task closures
Monitor project performance
Provide management-level visibility into operations

## 5. Secure Authentication & Authorization
JWT-based authentication
Role-aware authorization guards
Secure password hashing
Clean separation between auth logic and domain logic

### Tech Stack
Language: TypeScript
Framework: NestJS
Database: Relational DB (Prisma)
Authentication: JWT
Architecture: Modular, service-oriented
Demo Accounts

## Use the following credentials to explore the system:

for Super Admin
Email: superadmin2@gmail.com
Password: Justin99$

for Project Manager (PM)
Email: muyideen@gmail.com
Password: muiyideen

⚠️ These credentials are for demo purposes only

### How the System Is Designed

POFT prioritizes:

Correctness over convenience
Security over shortcuts
Explicit workflows over implicit behavior

### Project Status
- Core features implemented ( auth, Fund requests, contract amendment, Internal account creation per role, KPI Analytics, Notification) 
- Demonstrated in pre-production environments
-  Actively and currently being optimized for   maintainability and clarity cause I understand Domain-Driven Design and the 10 OWASP Principles for a secured systeem
-  Currently expanding cloud and infrastructure knowledge (AWS) to support scalable backend deployments

### What This Project Demonstrates

If you are reviewing this as an employer or technical lead, POFT demonstrates my ability to:

- Design backend systems beyond CRUD
- Model and orchestrate real business workflows
- Design good schema
- Handle concurrency and state correctness
