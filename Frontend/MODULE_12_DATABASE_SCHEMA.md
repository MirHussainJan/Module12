# MODULE 12 DATABASE SCHEMA
## EquipHub - Hardware & Asset Rental Integration

**Project:** National Freelance and Skill Verification Platform  
**Module:** Module 12 - EquipHub  
**Team Members:** Hamza Aftab, Mir Hussain Jan, Muhammad Ibraheem  
**Date:** April 22, 2026

---

## TABLE STRUCTURES

### 1. ASSETS Table
Stores all equipment/hardware listings.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| asset_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| owner_id | INT | FOREIGN KEY, NOT NULL | References User from Module 3 |
| asset_name | VARCHAR(200) | NOT NULL | Equipment name |
| category | ENUM | NOT NULL | Photography, Videography, Audio, Computing, Design, Other |
| description | TEXT | NOT NULL | Detailed description |
| condition | ENUM | NOT NULL | Brand New, Excellent, Good, Fair |
| daily_rate | DECIMAL(10,2) | NOT NULL | Rental price per day (PKR) |
| security_deposit | DECIMAL(10,2) | NOT NULL | Refundable deposit amount |
| pickup_location | VARCHAR(255) | NOT NULL | Physical pickup address |
| city | VARCHAR(100) | NOT NULL | City for filtering |
| status | ENUM | DEFAULT 'Available' | Available, Rented, Under_Maintenance, Inactive |
| requires_advance_booking | BOOLEAN | DEFAULT FALSE | 1-day advance notice required |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Listing creation date |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update |

**Indexes:**
```sql
CREATE INDEX idx_owner ON ASSETS(owner_id);
CREATE INDEX idx_status_category ON ASSETS(status, category);
CREATE INDEX idx_city ON ASSETS(city);
```

---

### 2. ASSET_IMAGES Table
Stores multiple images per asset.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| image_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| asset_id | INT | FOREIGN KEY, NOT NULL | References ASSETS(asset_id) |
| image_url | VARCHAR(500) | NOT NULL | Path/URL to image |
| is_primary | BOOLEAN | DEFAULT FALSE | Main display image |
| upload_order | INT | NOT NULL | Display sequence |
| uploaded_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Upload timestamp |

**Relationship:** One-to-Many (ASSETS → ASSET_IMAGES)

```sql
ALTER TABLE ASSET_IMAGES 
ADD CONSTRAINT fk_asset_images 
FOREIGN KEY (asset_id) REFERENCES ASSETS(asset_id) 
ON DELETE CASCADE;
```

---

### 3. ASSET_SPECIFICATIONS Table
Stores technical specs for equipment.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| spec_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| asset_id | INT | FOREIGN KEY, NOT NULL | References ASSETS(asset_id) |
| spec_key | VARCHAR(100) | NOT NULL | e.g., "Sensor Size", "RAM" |
| spec_value | VARCHAR(255) | NOT NULL | e.g., "45MP Full-Frame" |

**Relationship:** One-to-Many (ASSETS → ASSET_SPECIFICATIONS)

```sql
ALTER TABLE ASSET_SPECIFICATIONS 
ADD CONSTRAINT fk_asset_specs 
FOREIGN KEY (asset_id) REFERENCES ASSETS(asset_id) 
ON DELETE CASCADE;
```

---

### 4. BOOKINGS Table
Stores all rental transactions.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| booking_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| asset_id | INT | FOREIGN KEY, NOT NULL | References ASSETS(asset_id) |
| renter_id | INT | FOREIGN KEY, NOT NULL | References User from Module 3 |
| owner_id | INT | FOREIGN KEY, NOT NULL | References User from Module 3 |
| start_date | DATE | NOT NULL | Rental start date |
| end_date | DATE | NOT NULL | Rental end date |
| rental_days | INT | NOT NULL | Calculated duration |
| daily_rate | DECIMAL(10,2) | NOT NULL | Rate at time of booking |
| total_rental_amount | DECIMAL(10,2) | NOT NULL | daily_rate × rental_days |
| security_deposit | DECIMAL(10,2) | NOT NULL | Deposit at time of booking |
| total_amount | DECIMAL(10,2) | NOT NULL | rental + deposit |
| escrow_transaction_id | VARCHAR(100) | UNIQUE | From Module 7 (Payment) |
| booking_status | ENUM | DEFAULT 'Pending' | Pending, Confirmed, Active, Completed, Cancelled |
| pickup_verified_at | TIMESTAMP | NULL | Handover completion time |
| return_verified_at | TIMESTAMP | NULL | Return completion time |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Booking creation |

**Indexes:**
```sql
CREATE INDEX idx_renter ON BOOKINGS(renter_id);
CREATE INDEX idx_owner ON BOOKINGS(owner_id);
CREATE INDEX idx_asset_dates ON BOOKINGS(asset_id, start_date, end_date);
CREATE INDEX idx_status ON BOOKINGS(booking_status);
```

**Business Rules:**
- `end_date` must be greater than `start_date`
- `rental_days` = DATEDIFF(end_date, start_date)
- `total_rental_amount` = daily_rate × rental_days
- `total_amount` = total_rental_amount + security_deposit

---

### 5. HANDOVER_RECORDS Table
Stores digital handover verification data (QR/OTP).

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| handover_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| booking_id | INT | FOREIGN KEY, NOT NULL | References BOOKINGS(booking_id) |
| handover_type | ENUM | NOT NULL | Pickup, Return |
| verification_method | ENUM | NOT NULL | QR_Code, OTP |
| qr_code_data | VARCHAR(500) | NULL | Unique QR payload |
| otp_code | CHAR(4) | NULL | 4-digit OTP |
| otp_expires_at | TIMESTAMP | NULL | OTP validity (30 min) |
| verified_by | INT | NULL | User ID who verified (Module 3) |
| verified_at | TIMESTAMP | NULL | Verification timestamp |
| verification_status | ENUM | DEFAULT 'Pending' | Pending, Verified, Expired |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation |

**Indexes:**
```sql
CREATE INDEX idx_booking ON HANDOVER_RECORDS(booking_id);
CREATE INDEX idx_otp ON HANDOVER_RECORDS(otp_code, otp_expires_at);
```

**Business Rules:**
- For each `booking_id`, must have 2 records: one Pickup, one Return
- `otp_expires_at` = created_at + 30 minutes
- `otp_code` must be unique and randomly generated

---

### 6. CONDITION_PHOTOS Table
Stores condition documentation photos during handover.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| photo_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| handover_id | INT | FOREIGN KEY, NOT NULL | References HANDOVER_RECORDS |
| photo_type | ENUM | NOT NULL | Front_View, Back_View, Accessories, Serial_Number |
| image_url | VARCHAR(500) | NOT NULL | Path to photo |
| uploaded_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Upload time |

**Relationship:** One-to-Many (HANDOVER_RECORDS → CONDITION_PHOTOS)

```sql
ALTER TABLE CONDITION_PHOTOS 
ADD CONSTRAINT fk_handover_photos 
FOREIGN KEY (handover_id) REFERENCES HANDOVER_RECORDS(handover_id) 
ON DELETE CASCADE;
```

---

### 7. ASSET_REVIEWS Table
Stores reviews after rental completion.

| Attribute | Data Type | Constraints | Description |
|-----------|-----------|-------------|-------------|
| review_id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| booking_id | INT | FOREIGN KEY, UNIQUE, NOT NULL | References BOOKINGS (one review per booking) |
| asset_id | INT | FOREIGN KEY, NOT NULL | References ASSETS |
| reviewer_id | INT | NOT NULL | Renter who reviews (Module 3) |
| rating | DECIMAL(2,1) | CHECK (1.0-5.0) | Star rating |
| review_text | TEXT | NULL | Optional written review |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Review submission |

**Indexes:**
```sql
CREATE INDEX idx_asset ON ASSET_REVIEWS(asset_id);
```

**Business Rules:**
- Can only review after `booking_status` = 'Completed'
- One review per booking (UNIQUE constraint on booking_id)

---

## ENTITY RELATIONSHIP DIAGRAM (ERD)

```
ASSETS (1) ──────< (M) ASSET_IMAGES
ASSETS (1) ──────< (M) ASSET_SPECIFICATIONS
ASSETS (1) ──────< (M) BOOKINGS
ASSETS (1) ──────< (M) ASSET_REVIEWS

BOOKINGS (1) ────< (M) HANDOVER_RECORDS
BOOKINGS (1) ────< (1) ASSET_REVIEWS

HANDOVER_RECORDS (1) ────< (M) CONDITION_PHOTOS

[Module 3 - Users] ──< ASSETS (owner_id)
[Module 3 - Users] ──< BOOKINGS (renter_id, owner_id)
[Module 7 - Payment] ──< BOOKINGS (escrow_transaction_id)
```

---

## DATA REQUIRED FROM OTHER MODULES

### From Module 3 (Marketplace/User Management):
We need access to the following user data (via API or shared database):

| Data Item | Type | Purpose |
|-----------|------|---------|
| user_id | INT | Link assets and bookings to users |
| full_name | VARCHAR | Display owner/renter names |
| profile_picture_url | VARCHAR | User avatars in listings |
| phone_number | VARCHAR | Handover coordination |
| email | VARCHAR | Notification delivery |
| user_rating | DECIMAL | Display owner credibility |
| total_listings | INT | Show owner's portfolio size |

**API Endpoint Needed:**  
`GET /api/users/{user_id}/profile`

---

### From Module 7 (Payment/Escrow):
We need access to payment transaction data:

| Data Item | Type | Purpose |
|-----------|------|---------|
| escrow_transaction_id | VARCHAR | Link booking to payment |
| escrow_status | ENUM | Track payment state (Held, Released, Refunded) |
| amount_held | DECIMAL | Verify correct amount |
| deposit_released_at | TIMESTAMP | Track deposit return |
| payment_method | VARCHAR | Display to users |

**API Endpoints Needed:**
- `POST /api/escrow/hold` - Initiate escrow on booking
- `POST /api/escrow/release` - Release deposit after return
- `GET /api/escrow/{transaction_id}/status` - Check status

---

### From Module 6 (Communication):
We trigger notifications but don't store their data:

**API Endpoints Needed:**
- `POST /api/notifications/send` - Send OTP/QR codes
- Payload example:
```json
{
  "user_id": 123,
  "notification_type": "SMS",
  "message": "Your EquipHub OTP is: 7492",
  "priority": "high"
}
```

---

## INTEGRATION API ENDPOINTS (Exposed by Module 12)

### For Module 3 (Marketplace):

#### 1. Get Asset Catalog
```
GET /api/v1/assets/catalog
Query Params: ?category={cat}&city={city}&status=Available
Response: List of available assets with images and pricing
```

#### 2. Get Asset Availability
```
GET /api/v1/assets/{asset_id}/availability
Query Params: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
Response: Boolean availability + conflicting bookings
```

---

### For Module 7 (Payment):

#### 3. Create Booking
```
POST /api/v1/bookings/create
Body: {
  "asset_id": 123,
  "renter_id": 456,
  "start_date": "2026-04-22",
  "end_date": "2026-04-25"
}
Response: booking_id + escrow amount required
```

#### 4. Confirm Payment Received
```
PUT /api/v1/bookings/{booking_id}/confirm-payment
Body: {
  "escrow_transaction_id": "ESC-2026-ABC123"
}
Response: Booking status updated to 'Confirmed'
```

---

### For Digital Handover Flow:

#### 5. Initiate Pickup
```
POST /api/v1/handover/pickup/initiate
Body: {
  "booking_id": 789,
  "verification_method": "OTP"
}
Response: QR code data or OTP code
```

#### 6. Verify Handover
```
POST /api/v1/handover/verify
Body: {
  "handover_id": 101,
  "verification_code": "7492"
}
Response: Success + updates asset status to 'Rented'
Triggers: Module 6 notification to owner
```

#### 7. Complete Return
```
POST /api/v1/handover/return/complete
Body: {
  "booking_id": 789,
  "condition_photos": ["url1", "url2"]
}
Response: Success
Triggers: Module 7 escrow release + Module 6 notification
```

---

## KEY CONSTRAINTS & BUSINESS RULES

### 1. Availability Check
Before creating a booking, check for overlapping dates:
```sql
SELECT COUNT(*) FROM BOOKINGS 
WHERE asset_id = ? 
AND booking_status IN ('Confirmed', 'Active')
AND (
  (start_date <= ? AND end_date >= ?) OR
  (start_date <= ? AND end_date >= ?) OR
  (start_date >= ? AND end_date <= ?)
);
```
If COUNT > 0, asset is unavailable.

---

### 2. Escrow Workflow
1. **Booking Created** → Status = 'Pending'
2. **Module 7 Confirms Payment** → Status = 'Confirmed'
3. **Pickup Verified** → Status = 'Active' + ASSETS.status = 'Rented'
4. **Return Verified** → Status = 'Completed' + ASSETS.status = 'Available'
5. **Module 7 Releases Deposit** → Notify both parties (Module 6)

---

### 3. Cascade Deletions
- If ASSET deleted → Delete all ASSET_IMAGES, ASSET_SPECIFICATIONS
- If BOOKING deleted (before pickup) → Delete HANDOVER_RECORDS
- **DO NOT** allow ASSET deletion if active bookings exist

---

### 4. Data Integrity
- `total_rental_amount` MUST equal `daily_rate × rental_days`
- `total_amount` MUST equal `total_rental_amount + security_deposit`
- `pickup_verified_at` MUST be before `return_verified_at`
- Asset status CANNOT be 'Available' if any booking has status 'Active'

---

## SAMPLE SQL CREATE STATEMENTS

### ASSETS Table
```sql
CREATE TABLE ASSETS (
  asset_id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  asset_name VARCHAR(200) NOT NULL,
  category ENUM('Photography', 'Videography', 'Audio', 'Computing', 'Design', 'Other') NOT NULL,
  description TEXT NOT NULL,
  condition ENUM('Brand New', 'Excellent', 'Good', 'Fair') NOT NULL,
  daily_rate DECIMAL(10,2) NOT NULL CHECK (daily_rate > 0),
  security_deposit DECIMAL(10,2) NOT NULL CHECK (security_deposit >= 0),
  pickup_location VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  status ENUM('Available', 'Rented', 'Under_Maintenance', 'Inactive') DEFAULT 'Available',
  requires_advance_booking BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_owner (owner_id),
  INDEX idx_status_category (status, category),
  INDEX idx_city (city)
);
```

### BOOKINGS Table
```sql
CREATE TABLE BOOKINGS (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  asset_id INT NOT NULL,
  renter_id INT NOT NULL,
  owner_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rental_days INT NOT NULL,
  daily_rate DECIMAL(10,2) NOT NULL,
  total_rental_amount DECIMAL(10,2) NOT NULL,
  security_deposit DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  escrow_transaction_id VARCHAR(100) UNIQUE,
  booking_status ENUM('Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled') DEFAULT 'Pending',
  pickup_verified_at TIMESTAMP NULL,
  return_verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES ASSETS(asset_id),
  CHECK (end_date > start_date),
  CHECK (rental_days > 0),
  INDEX idx_renter (renter_id),
  INDEX idx_owner (owner_id),
  INDEX idx_asset_dates (asset_id, start_date, end_date),
  INDEX idx_status (booking_status)
);
```

### HANDOVER_RECORDS Table
```sql
CREATE TABLE HANDOVER_RECORDS (
  handover_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  handover_type ENUM('Pickup', 'Return') NOT NULL,
  verification_method ENUM('QR_Code', 'OTP') NOT NULL,
  qr_code_data VARCHAR(500),
  otp_code CHAR(4),
  otp_expires_at TIMESTAMP,
  verified_by INT,
  verified_at TIMESTAMP,
  verification_status ENUM('Pending', 'Verified', 'Expired') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES BOOKINGS(booking_id),
  INDEX idx_booking (booking_id),
  INDEX idx_otp (otp_code, otp_expires_at)
);
```

---

## VERSION HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-22 | Hamza Aftab | Initial schema design based on SPMP requirements |

---

## NOTES FOR INTEGRATION GROUP

1. **Module 3 Dependency**: We MUST have `user_id` references working before we can test bookings
2. **Module 7 Critical Path**: Escrow API must be ready by April 25 for integration testing
3. **Module 6 Notification**: OTP delivery is essential for handover flow - need SMS/Push capability
4. **Out of Scope**: Physical logistics tracking, automated condition assessment, skill-based gating

---

**End of Database Schema Document**
