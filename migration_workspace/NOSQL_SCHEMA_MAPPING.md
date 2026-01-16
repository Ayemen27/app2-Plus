# NoSQL Schema Mapping (PostgreSQL to Firestore)

## 🗄 Collections Structure

### 1. `users` (Collection)
- **Document ID:** `uid` (Firebase Auth UID)
- **Fields:**
  - `email`: string
  - `firstName`: string
  - `lastName`: string
  - `role`: string (admin, manager, user)
  - `isActive`: boolean
  - `fcmToken`: string
  - `createdAt`: timestamp
  - `updatedAt`: timestamp

### 2. `projects` (Collection)
- **Document ID:** `uuid`
- **Fields:**
  - `name`: string
  - `description`: string
  - `status`: string (active, completed, paused)
  - `projectTypeId`: string (Reference to `project_types`)
  - `engineerId`: string (Reference to `users`)
  - `metadata`: map (budget, location, etc.)

### 3. `workers` (Collection)
- **Document ID:** `uuid`
- **Fields:**
  - `name`: string
  - `type`: string
  - `dailyWage`: number
  - `isActive`: boolean

### 4. `worker_attendance` (Collection)
- **Document ID:** `uuid`
- **Fields:**
  - `projectId`: string (Ref)
  - `workerId`: string (Ref)
  - `attendanceDate`: string (YYYY-MM-DD)
  - `totalPay`: number
  - `wellId`: string (Ref)

### 5. `material_purchases` (Collection)
- **Document ID:** `uuid`
- **Fields:**
  - `projectId`: string (Ref)
  - `supplierId`: string (Ref)
  - `materialName`: string
  - `totalAmount`: number
  - `purchaseDate`: string (YYYY-MM-DD)

## 🔗 Relationships Handling
- **Normalization:** Unlike SQL, some data will be denormalized (e.g., storing `workerName` inside `attendance` to reduce reads).
- **Sub-collections:** `worker_attendance` could be a sub-collection of `projects` if queries are always project-scoped.

## 🛡 Security Rules Mapping
- **Admin:** Full access to all collections.
- **Manager:** Access to assigned `projects` and related `attendance`.
- **User:** Read-only access to their profile.
