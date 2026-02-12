# KSI GADGETS - Technical Architecture Document

**Version:** 2.0  
**Date:** February 10, 2026  
**Author:** Chief Technology Officer  
**Classification:** Internal - Technical Specification

---

## Executive Summary

KSI GADGETS is a high-end electronics e-commerce platform designed to handle thousands of concurrent customers purchasing the latest technology products. This document outlines our production-grade architecture built on Node.js/Express with PostgreSQL and Redis, capable of scaling to 1 million+ concurrent visitors while maintaining sub-second response times.

---

## 1. SYSTEM OVERVIEW

### 1.1 Architecture Philosophy

Our architecture follows a **microservices-ready monolithic approach** with clear separation of concerns, enabling future horizontal scaling while maintaining development velocity. The system is built on three core principles:

1. **Modularity** - Clean separation of layers (Controllers → Services → Data Layer)
2. **Scalability** - Stateless design with external session storage
3. **Reliability** - Fault tolerance with circuit breakers and graceful degradation

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     LOAD BALANCER (HAProxy/Nginx)           │
│                     SSL Termination + DDoS Protection       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Node.js     │      │  Node.js     │      │  Node.js     │
│  Instance 1  │      │  Instance 2  │      │  Instance N  │
│  (Express)   │      │  (Express)   │      │  (Express)   │
└──────────────┘      └──────────────┘      └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Redis Cluster│      │  PostgreSQL  │      │   CDN        │
│ - Cache      │      │  Primary DB  │      │ (CloudFront) │
│ - Sessions   │      │  + Read      │      │ - Images     │
│ - Rate Limit │      │    Replicas  │      │ - Static     │
│ - Queue      │      └──────────────┘      └──────────────┘
└──────────────┘
        │
        ▼
┌──────────────┐
│ Background   │
│ Workers      │
│ - Emails     │
│ - Analytics  │
└──────────────┘
```

### 1.3 Technology Stack

#### Core Backend
- **Runtime:** Node.js v20+ (LTS)
- **Framework:** Express.js v4.18+
- **Language:** TypeScript v5.3+
- **ORM:** TypeORM v0.3.19+

#### Data Layer
- **Primary Database:** PostgreSQL v15+ (ACID-compliant transactions)
- **Cache Layer:** Redis v7+ (Cluster mode)
- **File Storage:** AWS S3 / Azure Blob Storage
- **Search Engine:** Elasticsearch v8+ (product search)

#### Security & Infrastructure
- **Authentication:** JWT (RS256 algorithm)
- **Encryption:** bcrypt (password), TLS 1.3 (transport)
- **Rate Limiting:** Redis-backed sliding window
- **Monitoring:** Prometheus + Grafana
- **Logging:** Winston → ELK Stack (Elasticsearch, Logstash, Kibana)

### 1.4 Application Layers

```
┌─────────────────────────────────────────────┐
│          PRESENTATION LAYER                  │
│  Routes → Validators → Middleware            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│          BUSINESS LOGIC LAYER                │
│  Controllers → Services → Domain Logic       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│          DATA ACCESS LAYER                   │
│  Repositories → Models → Database            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│          INFRASTRUCTURE LAYER                │
│  Cache → Queue → External Services           │
└─────────────────────────────────────────────┘
```

### 1.5 Key Services Architecture

#### Flash Sale Service (Critical for High-Demand Products)
```
Flash Sale Request
       │
       ▼
┌─────────────────┐
│ Rate Limiter    │ ← Redis (100 req/sec/user)
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Stock Check     │ ← Redis Cache (Hot data)
│ (Redis Atomic)  │   TTL: 30 seconds
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Inventory Lock  │ ← Redis SETNX (Distributed Lock)
│ (30s timeout)   │   Prevents overselling
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Order Queue     │ ← Redis Queue (BullMQ)
│ (Background)    │   Process in order
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ DB Transaction  │ ← PostgreSQL
│ (Commit Order)  │   Final confirmation
└─────────────────┘
```

---

## 2. DATABASE SCHEMA

### 2.1 PostgreSQL Database Design

Our database follows **Third Normal Form (3NF)** with strategic denormalization for read-heavy operations.

#### 2.1.1 Users Table

```sql
CREATE TABLE users (
    -- Primary Key
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Authentication
    email               VARCHAR(255) UNIQUE NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    role                VARCHAR(20) NOT NULL DEFAULT 'customer',
                        -- ENUM: 'customer', 'admin', 'super_admin'
    
    -- Personal Information
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    phone               VARCHAR(20),
    
    -- Address Information
    shipping_address    JSONB,  -- { street, city, state, zip, country }
    billing_address     JSONB,
    
    -- Account Status
    is_active           BOOLEAN DEFAULT true,
    is_verified         BOOLEAN DEFAULT false,
    email_verified_at   TIMESTAMP,
    
    -- Security
    last_login_at       TIMESTAMP,
    login_attempts      INTEGER DEFAULT 0,
    locked_until        TIMESTAMP,
    two_factor_enabled  BOOLEAN DEFAULT false,
    two_factor_secret   VARCHAR(255),
    
    -- Metadata
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP,  -- Soft delete
    
    -- Constraints
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    CONSTRAINT valid_role CHECK (role IN ('customer', 'admin', 'super_admin'))
);

-- Indexes for Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = true;
```

#### 2.1.2 Products Table

```sql
CREATE TABLE products (
    -- Primary Key
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Information
    sku                 VARCHAR(100) UNIQUE NOT NULL,
    name                VARCHAR(255) NOT NULL,
    slug                VARCHAR(255) UNIQUE NOT NULL,
    description         TEXT,
    short_description   VARCHAR(500),
    
    -- Category & Classification
    category            VARCHAR(100) NOT NULL,
    subcategory         VARCHAR(100),
    brand               VARCHAR(100),
    tags                TEXT[],  -- Array for flexible tagging
    
    -- Pricing
    price               DECIMAL(10, 2) NOT NULL,
    compare_at_price    DECIMAL(10, 2),  -- Original price for discounts
    cost_price          DECIMAL(10, 2),  -- For margin calculation
    
    -- Inventory Management
    stock_quantity      INTEGER NOT NULL DEFAULT 0,
    reserved_quantity   INTEGER NOT NULL DEFAULT 0,  -- In-cart but not purchased
    available_quantity  INTEGER GENERATED ALWAYS AS (stock_quantity - reserved_quantity) STORED,
    low_stock_threshold INTEGER DEFAULT 10,
    
    -- Product Status
    is_active           BOOLEAN DEFAULT true,
    is_featured         BOOLEAN DEFAULT false,
    is_flash_sale       BOOLEAN DEFAULT false,
    flash_sale_price    DECIMAL(10, 2),
    flash_sale_start    TIMESTAMP,
    flash_sale_end      TIMESTAMP,
    
    -- Media
    images              JSONB,  -- [{ url, alt, is_primary, order }]
    video_url           VARCHAR(500),
    
    -- Specifications
    specifications      JSONB,  -- { processor: "A15", ram: "8GB", ... }
    dimensions          JSONB,  -- { weight, length, width, height, unit }
    
    -- SEO
    meta_title          VARCHAR(255),
    meta_description    VARCHAR(500),
    meta_keywords       TEXT[],
    
    -- Analytics
    view_count          INTEGER DEFAULT 0,
    purchase_count      INTEGER DEFAULT 0,
    rating_average      DECIMAL(3, 2) DEFAULT 0.00,
    rating_count        INTEGER DEFAULT 0,
    
    -- Metadata
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP,  -- Soft delete
    
    -- Constraints
    CONSTRAINT positive_price CHECK (price > 0),
    CONSTRAINT valid_stock CHECK (stock_quantity >= 0),
    CONSTRAINT valid_rating CHECK (rating_average >= 0 AND rating_average <= 5)
);

-- Critical Indexes for Performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_flash_sale ON products(is_flash_sale, flash_sale_start, flash_sale_end) 
    WHERE is_flash_sale = true;
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_rating ON products(rating_average DESC);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_stock ON products(available_quantity);
CREATE INDEX idx_products_search ON products USING GIN(to_tsvector('english', name || ' ' || description));
```

#### 2.1.3 Orders Table

```sql
CREATE TABLE orders (
    -- Primary Key
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number            VARCHAR(50) UNIQUE NOT NULL,  -- Human-readable: ORD-2026-000001
    
    -- Foreign Keys
    user_id                 UUID NOT NULL REFERENCES users(id),
    
    -- Order Status
    status                  VARCHAR(50) NOT NULL DEFAULT 'pending',
                            -- ENUM: pending, confirmed, processing, shipped, delivered, cancelled, refunded
    payment_status          VARCHAR(50) NOT NULL DEFAULT 'pending',
                            -- ENUM: pending, paid, failed, refunded, partially_refunded
    fulfillment_status      VARCHAR(50) DEFAULT 'unfulfilled',
                            -- ENUM: unfulfilled, partially_fulfilled, fulfilled
    
    -- Financial Information
    subtotal                DECIMAL(10, 2) NOT NULL,
    tax_amount              DECIMAL(10, 2) DEFAULT 0.00,
    shipping_amount         DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount         DECIMAL(10, 2) DEFAULT 0.00,
    total_amount            DECIMAL(10, 2) NOT NULL,
    currency                VARCHAR(3) DEFAULT 'USD',
    
    -- Payment Details
    payment_method          VARCHAR(50),  -- credit_card, debit_card, paypal, crypto, etc.
    payment_gateway         VARCHAR(50),  -- stripe, coinbase, paypal
    transaction_id          VARCHAR(255),
    payment_details         JSONB,  -- Gateway-specific data
    
    -- Shipping Information
    shipping_method         VARCHAR(100),
    shipping_address        JSONB NOT NULL,
    billing_address         JSONB NOT NULL,
    tracking_number         VARCHAR(255),
    carrier                 VARCHAR(100),
    estimated_delivery      DATE,
    delivered_at            TIMESTAMP,
    
    -- Customer Information (Denormalized for historical accuracy)
    customer_email          VARCHAR(255) NOT NULL,
    customer_phone          VARCHAR(20),
    customer_name           VARCHAR(255) NOT NULL,
    
    -- Order Notes
    customer_notes          TEXT,
    internal_notes          TEXT,  -- Admin only
    cancellation_reason     TEXT,
    
    -- Timestamps
    confirmed_at            TIMESTAMP,
    shipped_at              TIMESTAMP,
    cancelled_at            TIMESTAMP,
    refunded_at             TIMESTAMP,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_order_status CHECK (status IN (
        'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
    )),
    CONSTRAINT valid_payment_status CHECK (payment_status IN (
        'pending', 'paid', 'failed', 'refunded', 'partially_refunded'
    )),
    CONSTRAINT positive_amounts CHECK (
        subtotal >= 0 AND total_amount >= 0 AND tax_amount >= 0 
        AND shipping_amount >= 0 AND discount_amount >= 0
    )
);

-- Performance Indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_transaction_id ON orders(transaction_id);
```

#### 2.1.4 Order Items Table

```sql
CREATE TABLE order_items (
    -- Primary Key
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id          UUID REFERENCES products(id),  -- Nullable for deleted products
    
    -- Product Information (Denormalized - snapshot at order time)
    product_sku         VARCHAR(100) NOT NULL,
    product_name        VARCHAR(255) NOT NULL,
    product_image       VARCHAR(500),
    product_specs       JSONB,  -- Snapshot of key specs
    
    -- Pricing & Quantity
    quantity            INTEGER NOT NULL,
    unit_price          DECIMAL(10, 2) NOT NULL,
    subtotal            DECIMAL(10, 2) NOT NULL,
    discount_amount     DECIMAL(10, 2) DEFAULT 0.00,
    tax_amount          DECIMAL(10, 2) DEFAULT 0.00,
    total               DECIMAL(10, 2) NOT NULL,
    
    -- Fulfillment
    fulfillment_status  VARCHAR(50) DEFAULT 'unfulfilled',
    
    -- Metadata
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT positive_price CHECK (unit_price >= 0 AND total >= 0)
);

-- Indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

#### 2.1.5 Shopping Cart Tables

```sql
CREATE TABLE carts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id          VARCHAR(255),  -- For guest carts
    total_items         INTEGER DEFAULT 0,
    subtotal            DECIMAL(10, 2) DEFAULT 0.00,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at          TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

CREATE TABLE cart_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id             UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity            INTEGER NOT NULL DEFAULT 1,
    unit_price          DECIMAL(10, 2) NOT NULL,
    subtotal            DECIMAL(10, 2) NOT NULL,
    added_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    UNIQUE(cart_id, product_id)
);

-- Indexes
CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
```

#### 2.1.6 Reviews Table

```sql
CREATE TABLE reviews (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id            UUID REFERENCES orders(id),  -- Verified purchase
    rating              INTEGER NOT NULL,
    title               VARCHAR(200),
    comment             TEXT,
    is_verified         BOOLEAN DEFAULT false,
    is_approved         BOOLEAN DEFAULT false,
    helpful_count       INTEGER DEFAULT 0,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5),
    UNIQUE(product_id, user_id)  -- One review per user per product
);

-- Indexes
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
```

### 2.2 Redis Data Structure Design

Redis is used for **hot data caching**, **session management**, and **real-time operations**.

#### 2.2.1 Product Catalog Cache
```
Key Pattern: product:{productId}
Type: Hash
TTL: 300 seconds (5 minutes)
Data: { id, name, price, stock, images, rating }

Key Pattern: products:category:{category}
Type: Sorted Set (Score = popularity)
TTL: 600 seconds (10 minutes)
Members: productId1, productId2, ...

Key Pattern: products:featured
Type: List
TTL: 1800 seconds (30 minutes)
```

#### 2.2.2 Flash Sale Management
```
Key Pattern: flashsale:{productId}:stock
Type: String (Atomic counter)
TTL: Until flash sale ends
Operations: DECR (atomic stock reduction)

Key Pattern: flashsale:{productId}:lock:{userId}
Type: String (Distributed lock)
TTL: 30 seconds
Value: timestamp

Key Pattern: flashsale:{productId}:queue
Type: List (FIFO queue)
TTL: 3600 seconds
Members: userId1, userId2, ... (processing order)
```

#### 2.2.3 Session Management
```
Key Pattern: session:{sessionId}
Type: Hash
TTL: 86400 seconds (24 hours)
Data: { userId, email, role, cart, loginAt }
```

#### 2.2.4 Rate Limiting
```
Key Pattern: ratelimit:{ip}:{endpoint}
Type: String (Counter)
TTL: 60 seconds (sliding window)
Limit: Varies by endpoint (e.g., 100/min for normal, 10/min for flash sales)
```

#### 2.2.5 Real-Time Analytics
```
Key Pattern: analytics:views:{productId}
Type: HyperLogLog
TTL: 86400 seconds
Purpose: Unique visitor count

Key Pattern: analytics:trending
Type: Sorted Set (Score = view count)
TTL: 3600 seconds
```

### 2.3 Database Optimization Strategies

#### 2.3.1 Read Replicas
- **1 Primary (Write)** + **3 Read Replicas** for load distribution
- All SELECT queries routed to read replicas
- Replication lag monitoring < 1 second

#### 2.3.2 Connection Pooling
```typescript
PostgreSQL Pool Configuration:
- Min Connections: 10
- Max Connections: 100
- Idle Timeout: 30 seconds
- Connection Timeout: 5 seconds
```

#### 2.3.3 Query Optimization
- All foreign keys indexed
- Composite indexes for common query patterns
- EXPLAIN ANALYZE for all critical queries
- Query response time < 100ms target

---

## 3. SECURITY MEASURES

### 3.1 Authentication & Authorization

#### 3.1.1 JWT Token Strategy

**Access Token (Short-lived)**
```typescript
Algorithm: RS256 (Asymmetric)
Expiration: 15 minutes
Storage: Memory only (React state)
Claims: { userId, email, role, permissions }
```

**Refresh Token (Long-lived)**
```typescript
Algorithm: RS256
Expiration: 7 days
Storage: HttpOnly Cookie (Secure, SameSite=Strict)
Rotation: On each use (prevents token reuse)
Revocation: Redis blacklist
```

**Token Validation Flow:**
```
1. Client sends Access Token in Authorization header
2. Server validates signature & expiration
3. If expired → Client uses Refresh Token
4. Server validates Refresh Token from HttpOnly cookie
5. Issue new Access + Refresh tokens
6. Old Refresh Token blacklisted in Redis
```

#### 3.1.2 Password Security

- **Hashing:** bcrypt with salt rounds = 12
- **Password Requirements:**
  - Minimum 8 characters
  - At least 1 uppercase, 1 lowercase, 1 digit, 1 special character
  - Not in common password dictionary (10,000 most common)
- **Brute Force Protection:**
  - Account lockout after 5 failed attempts
  - Lockout duration: 30 minutes
  - CAPTCHA after 3 failed attempts

#### 3.1.3 Two-Factor Authentication (2FA)

- **Method:** TOTP (Time-based One-Time Password)
- **Library:** speakeasy
- **Backup Codes:** 10 single-use codes generated
- **Mandatory for:** Admin accounts, high-value transactions

### 3.2 Data Protection

#### 3.2.1 Encryption

**At Rest:**
- PostgreSQL: Transparent Data Encryption (TDE)
- Disk-level encryption: AES-256
- Sensitive fields (SSN, credit cards): Application-level encryption using AWS KMS

**In Transit:**
- TLS 1.3 for all connections
- Certificate pinning for mobile apps
- HSTS (HTTP Strict Transport Security) enabled

#### 3.2.2 PII Data Handling

**Personally Identifiable Information Protection:**
- Credit card data: Never stored (Stripe tokenization)
- Email encryption: SHA-256 hash for lookups
- Address data: Encrypted at application level
- GDPR compliance: Right to be forgotten (data deletion)
- Data retention: 7 years for orders, 30 days for logs

#### 3.2.3 Payment Security

- **PCI DSS Compliance:** Level 1 certified
- **Payment Tokenization:** Stripe/Coinbase handles sensitive data
- **No card storage:** All payments via secure gateways
- **3D Secure:** Required for transactions > $500
- **Fraud Detection:** Machine learning model scores each transaction

### 3.3 API Security

#### 3.3.1 Rate Limiting Strategy

```typescript
Endpoint-Specific Rate Limits:
- Authentication: 5 requests/minute per IP
- Product Listing: 100 requests/minute per user
- Flash Sales: 10 requests/minute per user
- Checkout: 20 requests/minute per user
- Search: 50 requests/minute per user
- Admin APIs: 200 requests/minute per admin
```

**Implementation:** Redis-backed sliding window algorithm

#### 3.3.2 Input Validation & Sanitization

**Layer 1: Schema Validation**
- express-validator for all inputs
- Whitelist approach (only allow known fields)
- Type checking & format validation

**Layer 2: SQL Injection Prevention**
- TypeORM parameterized queries (no raw SQL)
- Input sanitization for special characters
- Prepared statements for all database queries

**Layer 3: XSS Prevention**
- HTML sanitization using DOMPurify
- Content Security Policy (CSP) headers
- Output encoding for all user-generated content

**Layer 4: CSRF Protection**
- CSRF tokens for all state-changing operations
- SameSite cookies
- Origin validation

#### 3.3.3 DDoS Protection

**Multiple Layers:**

1. **CDN/WAF Layer (Cloudflare/AWS WAF)**
   - Challenge-based bot detection
   - IP reputation scoring
   - Geographic filtering

2. **Application Layer (Express)**
   - Rate limiting per IP/User
   - Request size limits (10MB max)
   - Slowloris protection (connection timeout)

3. **Infrastructure Layer**
   - Auto-scaling based on load
   - Traffic spike alerts
   - Circuit breaker pattern for downstream services

### 3.4 Monitoring & Incident Response

#### 3.4.1 Security Monitoring

**Real-Time Alerts:**
- Multiple failed login attempts
- Unusual IP address changes
- API rate limit violations
- High-value transactions
- Database query anomalies
- Unauthorized access attempts

**Logging Strategy:**
```typescript
Log Levels:
- ERROR: All security incidents
- WARN: Suspicious activities
- INFO: User actions (login, purchase)
- DEBUG: Development only (disabled in production)

Log Aggregation: ELK Stack (Elasticsearch, Logstash, Kibana)
Retention: 90 days hot, 1 year archived
```

#### 3.4.2 Incident Response Plan

**Severity Levels:**
1. **Critical:** Data breach, payment system down
2. **High:** Authentication bypass, XSS vulnerability
3. **Medium:** Rate limit bypass, suspicious activity
4. **Low:** Failed login attempts, minor bugs

**Response Times:**
- Critical: 15 minutes (24/7 on-call)
- High: 2 hours
- Medium: 8 hours
- Low: 24 hours

### 3.5 Compliance & Auditing

- **GDPR:** Data portability, right to erasure, consent management
- **PCI DSS:** Payment card data protection
- **SOC 2 Type II:** Security, availability, processing integrity
- **Regular Security Audits:** Quarterly penetration testing
- **Vulnerability Scanning:** Weekly automated scans (OWASP ZAP)

---

## 4. SCALING STRATEGY

### 4.1 Horizontal Scaling Architecture

#### 4.1.1 Auto-Scaling Configuration

**Node.js Application Servers:**
```yaml
Minimum Instances: 3 (across 3 availability zones)
Maximum Instances: 50
Target CPU Utilization: 70%
Target Memory Utilization: 80%
Scale-Out Threshold: > 70% for 2 minutes
Scale-In Threshold: < 30% for 5 minutes
Cooldown Period: 300 seconds
```

**Load Balancer Configuration:**
```yaml
Type: Application Load Balancer (ALB)
Health Check: /health endpoint
Health Check Interval: 10 seconds
Unhealthy Threshold: 2 consecutive failures
Connection Draining: 60 seconds
Sticky Sessions: Disabled (stateless design)
```

#### 4.1.2 Database Scaling

**PostgreSQL Architecture:**
```
┌─────────────────────────────────────────────┐
│            Primary Instance                  │
│  (Writes Only + Real-time Reads)            │
│  Type: db.r6g.2xlarge (8 vCPU, 64GB RAM)   │
└─────────────────────────────────────────────┘
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Read    │  │  Read    │  │  Read    │
│ Replica 1│  │ Replica 2│  │ Replica 3│
│ (Region1)│  │ (Region1)│  │ (Region2)│
└──────────┘  └──────────┘  └──────────┘
```

**Read/Write Splitting:**
- All writes → Primary
- All reads → Read replicas (round-robin)
- Analytics queries → Dedicated replica
- Replication lag monitoring < 1 second

**Connection Pooling (pgBouncer):**
```
Pool Mode: Transaction
Pool Size: 500 connections
Max Client Connections: 10,000
Default Pool Size per Database: 100
```

#### 4.1.3 Redis Cluster

**Redis Sentinel Configuration:**
```yaml
Cluster Mode: Enabled
Shards: 3
Replicas per Shard: 2
Total Nodes: 9 (3 primary + 6 replicas)
Node Type: cache.r6g.xlarge (4 vCPU, 26GB RAM)
Failover: Automatic (< 30 seconds)
```

**Data Distribution Strategy:**
- Hash-based sharding
- Consistent hashing for minimal key redistribution
- Hot key monitoring and replication

### 4.2 Caching Strategy (Multi-Layer)

#### 4.2.1 CDN Layer (CloudFront/Cloudflare)

```
Static Assets Cache:
- Images: 1 year TTL
- CSS/JS: 1 year TTL with versioning
- Fonts: 1 year TTL
- API Responses: 5 minutes TTL (for public endpoints)

Edge Locations: 200+ globally
Cache Hit Ratio Target: > 90%
```

#### 4.2.2 Application Cache (Redis)

**Cache Strategies:**

**1. Cache-Aside (Lazy Loading)**
```typescript
// Used for product details, user profiles
async getProduct(id: string) {
  // 1. Check Redis cache
  const cached = await redis.get(`product:${id}`);
  if (cached) return JSON.parse(cached);
  
  // 2. Cache miss → Query database
  const product = await db.products.findOne(id);
  
  // 3. Store in cache (TTL: 5 minutes)
  await redis.setex(`product:${id}`, 300, JSON.stringify(product));
  
  return product;
}
```

**2. Write-Through Cache**
```typescript
// Used for frequently updated data (stock levels)
async updateStock(productId: string, quantity: number) {
  // 1. Update database
  await db.products.update(productId, { stock: quantity });
  
  // 2. Update cache immediately
  await redis.hset(`product:${productId}`, 'stock', quantity);
  
  // 3. Invalidate related caches
  await redis.del(`products:category:${category}`);
}
```

**3. Write-Behind Cache (Flash Sales)**
```typescript
// Used for high-frequency writes (flash sale inventory)
async reserveFlashSaleStock(productId: string) {
  // 1. Decrement Redis counter (atomic)
  const remaining = await redis.decr(`flashsale:${productId}:stock`);
  
  if (remaining < 0) {
    await redis.incr(`flashsale:${productId}:stock`); // Rollback
    throw new Error('Out of stock');
  }
  
  // 2. Queue database update for later (async)
  await queue.add('updateStock', { productId, quantity: -1 });
  
  return remaining;
}
```

#### 4.2.3 Cache Invalidation Strategy

**Time-Based (TTL):**
- Product catalog: 5 minutes
- User sessions: 24 hours
- Flash sale data: Until sale ends
- Analytics: 1 hour

**Event-Based Invalidation:**
```typescript
Events that trigger cache invalidation:
- Product update → Invalidate product:{id}
- Order placed → Invalidate cart:{userId}, stock data
- Price change → Invalidate product + category caches
- Flash sale start/end → Invalidate all flash sale caches
```

**Cache Warming (Proactive):**
```typescript
// Pre-populate cache before peak hours
async warmCache() {
  // 1. Load trending products
  const trending = await db.products.findTrending();
  await redis.mset(trending.map(p => [`product:${p.id}`, JSON.stringify(p)]));
  
  // 2. Load flash sale products
  const flashSale = await db.products.findFlashSale();
  await redis.mset(flashSale.map(p => [`flashsale:${p.id}:stock`, p.stock]));
}

// Run every hour during business hours
cron.schedule('0 * * * *', warmCache);
```

### 4.3 Flash Sale Architecture (Critical)

#### 4.3.1 Flash Sale Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    FLASH SALE REQUEST                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Rate Limiting (Redis)                              │
│  - Check: ratelimit:flashsale:{userId}                     │
│  - Limit: 10 requests/minute per user                      │
│  - Action: Reject if exceeded                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Queue Position (Redis Sorted Set)                 │
│  - Add to: flashsale:{productId}:queue                     │
│  - Score: timestamp (FIFO processing)                      │
│  - Return: Queue position to user                          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Stock Check (Redis Atomic)                        │
│  - Check: flashsale:{productId}:stock                      │
│  - Operation: DECR (atomic decrement)                      │
│  - Action: If < 0, return "Out of Stock"                  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Distributed Lock (Redis SETNX)                    │
│  - Key: flashsale:{productId}:lock:{userId}               │
│  - TTL: 30 seconds                                         │
│  - Ensures: Only one purchase per user at a time          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Add to Order Queue (BullMQ)                       │
│  - Queue: orders:flash-sale                                │
│  - Data: { userId, productId, price, timestamp }          │
│  - Priority: High                                          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: Return Success (Immediate Response)               │
│  - Status: "Order Reserved"                                │
│  - Message: "Processing your order..."                     │
│  - Estimated Time: 30 seconds                              │
└─────────────────────────────────────────────────────────────┘

        (Background Processing)
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKGROUND: Process Order (Workers)                        │
│  - Create order in PostgreSQL                              │
│  - Process payment (Stripe)                                │
│  - Send confirmation email                                 │
│  - Release lock                                            │
│  - Notify user via WebSocket                               │
└─────────────────────────────────────────────────────────────┘
```

#### 4.3.2 Flash Sale Anti-Patterns Prevention

**Problem 1: Bot Attacks**
```typescript
Solutions:
1. CAPTCHA on flash sale page (Google reCAPTCHA v3)
2. Device fingerprinting (FingerprintJS)
3. Behavioral analysis (mouse movement, time on page)
4. Rate limiting per IP + User ID
5. Request signature verification
```

**Problem 2: Inventory Overselling**
```typescript
Prevention:
1. Redis atomic operations (DECR)
2. Database constraints (CHECK stock >= 0)
3. Distributed locks (prevent race conditions)
4. Reserved inventory tracking
5. Reconciliation job (Redis ↔ PostgreSQL sync every 30 seconds)
```

**Problem 3: Server Overload**
```typescript
Mitigation:
1. Virtual waiting room (queue system)
2. Request throttling (max 10k concurrent)
3. Graceful degradation (disable non-critical features)
4. Circuit breaker pattern (fail fast)
5. Auto-scaling triggers (scale before peak)
```

#### 4.3.3 Flash Sale Performance Optimization

**Pre-Flash Sale Preparation (1 hour before):**
```typescript
1. Cache warming:
   - Load all flash sale products into Redis
   - Pre-calculate discounted prices
   - Load user session data

2. Scale infrastructure:
   - Scale to 80% of max capacity
   - Warm up database connections
   - Start additional Redis instances

3. Monitoring:
   - Enable real-time dashboards
   - Set up alert escalations
   - Staff on-call engineers
```

**During Flash Sale:**
```typescript
1. Real-time monitoring:
   - Request rate (target: < 100k/second)
   - Error rate (target: < 0.1%)
   - Response time (target: < 500ms p99)
   - Queue depth (alert if > 10k)

2. Dynamic adjustments:
   - Throttle if error rate spikes
   - Add more workers if queue grows
   - Disable non-essential features
```

**Post-Flash Sale:**
```typescript
1. Reconciliation:
   - Sync Redis stock with database
   - Process any failed orders
   - Generate analytics report

2. Scale down:
   - Gradually reduce instance count
   - Clear flash sale caches
   - Archive flash sale logs
```

### 4.4 Performance Optimization

#### 4.4.1 Response Time Targets

```
Endpoint                    P50      P95      P99     Max
---------------------------------------------------------
GET /products              50ms    100ms    200ms   500ms
GET /products/:id          30ms     80ms    150ms   300ms
POST /orders              100ms    300ms    500ms     1s
POST /flash-sale           50ms    200ms    500ms     1s
GET /cart                  30ms     80ms    150ms   300ms
```

#### 4.4.2 Database Query Optimization

**Query Analysis Tools:**
- EXPLAIN ANALYZE for all queries > 10ms
- pg_stat_statements for identifying slow queries
- Auto-indexing recommendations

**Connection Management:**
```typescript
// Use connection pooling
const pool = new Pool({
  min: 10,              // Minimum connections
  max: 100,             // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Use transactions for multi-step operations
await pool.query('BEGIN');
try {
  await pool.query('UPDATE products SET stock = stock - 1');
  await pool.query('INSERT INTO orders VALUES (...)');
  await pool.query('COMMIT');
} catch (error) {
  await pool.query('ROLLBACK');
}
```

#### 4.4.3 API Response Optimization

**Pagination:**
```typescript
// Cursor-based pagination (efficient for large datasets)
GET /products?cursor=UUID&limit=20

// Benefits:
- Consistent results (no duplicate/missing items)
- O(1) complexity for offset
- Works with real-time updates
```

**Partial Responses (Field Selection):**
```typescript
// Only return requested fields
GET /products?fields=id,name,price,images

// Reduces response size by 70%
```

**Compression:**
```typescript
// Enable gzip compression
app.use(compression({
  level: 6,           // Compression level (1-9)
  threshold: 1024,    // Only compress responses > 1KB
  filter: (req, res) => {
    return /json|text|javascript|css/.test(res.getHeader('Content-Type'));
  }
}));

// Typical compression ratio: 5:1 for JSON
```

### 4.5 Monitoring & Observability

#### 4.5.1 Metrics Collection (Prometheus)

**Infrastructure Metrics:**
- CPU usage per instance
- Memory usage per instance
- Network I/O
- Disk I/O
- Load balancer metrics

**Application Metrics:**
- Request rate (requests/second)
- Error rate (%)
- Response time (p50, p95, p99)
- Active connections
- Queue depth

**Business Metrics:**
- Orders per minute
- Revenue per hour
- Conversion rate
- Cart abandonment rate
- Product view-to-purchase ratio

#### 4.5.2 Logging Strategy

**Structured Logging (JSON format):**
```typescript
{
  "timestamp": "2026-02-10T10:30:45.123Z",
  "level": "INFO",
  "service": "api-server",
  "instance": "i-1234567890abcdef",
  "requestId": "uuid-request-id",
  "userId": "uuid-user-id",
  "method": "POST",
  "path": "/api/orders",
  "statusCode": 201,
  "responseTime": 145,
  "message": "Order created successfully"
}
```

**Log Aggregation Pipeline:**
```
Application → Fluentd → Elasticsearch → Kibana
                 ↓
          S3 (Archive)
```

#### 4.5.3 Alerting Rules

**Critical Alerts (PagerDuty):**
- Error rate > 1% for 5 minutes
- Response time p99 > 2 seconds for 5 minutes
- Database connection pool exhausted
- Redis cluster down
- Flash sale stock discrepancy > 10%

**Warning Alerts (Slack):**
- CPU usage > 80% for 10 minutes
- Memory usage > 85% for 10 minutes
- Cache hit rate < 80%
- Queue depth > 1000

### 4.6 Disaster Recovery & Business Continuity

#### 4.6.1 Backup Strategy

**Database Backups:**
- Full backup: Daily at 2 AM UTC
- Incremental backup: Every 6 hours
- Point-in-time recovery: Last 30 days
- Backup retention: 90 days
- Backup location: Multi-region (S3 + Glacier)

**Recovery Time Objective (RTO):**
- Critical services: 1 hour
- Non-critical services: 4 hours

**Recovery Point Objective (RPO):**
- Transactional data: 5 minutes
- Analytical data: 1 hour

#### 4.6.2 Failover Strategy

**Multi-Region Deployment:**
```
Primary Region: US-East-1
Secondary Region: US-West-2
Tertiary Region: EU-West-1

Failover Mechanism: Route53 health checks + DNS failover
Failover Time: < 5 minutes (automatic)
```

**Database Failover:**
- Automatic promotion of read replica to primary
- DNS update to point to new primary
- Replication lag check before promotion
- Failover time: < 2 minutes

---

## 5. DEPLOYMENT & CI/CD

### 5.1 Deployment Architecture

**Environments:**
```
Development → Staging → Production
     ↓           ↓          ↓
  Local       AWS QA    AWS Prod
              (1 AZ)   (3 AZs)
```

### 5.2 CI/CD Pipeline

```yaml
Stages:
1. Code Quality:
   - Linting (ESLint)
   - Type checking (TypeScript)
   - Security scan (Snyk)
   - Dependency audit

2. Build:
   - Compile TypeScript
   - Bundle assets
   - Create Docker image
   - Tag image with git SHA

3. Test:
   - Unit tests (Jest)
   - Integration tests
   - API tests (Postman/Newman)
   - Load tests (k6)

4. Deploy:
   - Deploy to staging
   - Run smoke tests
   - Manual approval (for production)
   - Deploy to production (blue-green)
   - Health check
   - Rollback if health check fails
```

**Deployment Strategy: Blue-Green**
- Zero downtime deployments
- Instant rollback capability
- Traffic shifting: 10% → 50% → 100%

---

## 6. COST OPTIMIZATION

### 6.1 Infrastructure Costs (Estimated Monthly)

```
Service                    Configuration           Monthly Cost
-----------------------------------------------------------------
EC2 (Application)         10x t3.xlarge           $1,216
EC2 (Auto-scaling peak)   40x t3.xlarge (2h/day)  $  324
RDS PostgreSQL            db.r6g.2xlarge          $  823
RDS Read Replicas         3x db.r6g.xlarge        $1,234
ElastiCache Redis         9-node cluster          $1,458
CloudFront CDN            1TB data transfer       $   85
S3 Storage                2TB + requests          $   46
Application Load Balancer 2x ALB                  $   38
Route53                   3 hosted zones          $    2
CloudWatch                Logs + Metrics          $  150
-----------------------------------------------------------------
Total Estimated Monthly Cost:                     $5,376

(Peak capacity: $8,200/month)
(Scales down to: $3,500/month during off-peak)
```

### 6.2 Cost Optimization Strategies

1. **Reserved Instances:** 40% savings on predictable baseline
2. **Spot Instances:** 70% savings for batch jobs/workers
3. **Auto-scaling:** Scale down during off-peak (nights, weekends)
4. **Cache optimization:** Reduce database queries by 80%
5. **CDN:** Reduce origin requests by 90%
6. **Storage tiering:** Move old data to cheaper storage (S3 Glacier)

---

## 7. FUTURE ENHANCEMENTS

### 7.1 Roadmap (Next 12 Months)

**Q2 2026:**
- Implement GraphQL API (alongside REST)
- Add Elasticsearch for advanced product search
- Implement real-time notifications (WebSockets)
- Machine learning-based product recommendations

**Q3 2026:**
- Microservices migration (gradual)
- Implement event-driven architecture (Kafka)
- Add internationalization (multi-language, multi-currency)
- Advanced fraud detection system

**Q4 2026:**
- Mobile app launch (React Native)
- Augmented Reality product preview
- Voice shopping integration (Alexa/Google)
- Blockchain-based loyalty program

### 7.2 Technology Evaluation

**Under Consideration:**
- **gRPC** for inter-service communication (faster than REST)
- **Kubernetes** for container orchestration (replace ECS)
- **Terraform** for infrastructure as code
- **Apache Kafka** for event streaming
- **Apache Airflow** for data pipeline orchestration

---

## 8. APPENDIX

### 8.1 Key Performance Indicators (KPIs)

**Technical KPIs:**
- Uptime: 99.95% (4.38 hours downtime/year)
- Response time p99: < 500ms
- Error rate: < 0.1%
- Cache hit rate: > 85%
- Database query time p95: < 100ms

**Business KPIs:**
- Conversion rate: > 3%
- Cart abandonment rate: < 70%
- Average order value: $350
- Customer lifetime value: $2,500
- Revenue per user: $180

### 8.2 Glossary

- **RTO (Recovery Time Objective):** Maximum acceptable downtime
- **RPO (Recovery Point Objective):** Maximum acceptable data loss
- **SLA (Service Level Agreement):** Guaranteed uptime commitment
- **TTL (Time To Live):** Cache expiration time
- **ACID:** Atomicity, Consistency, Isolation, Durability (database properties)
- **CORS:** Cross-Origin Resource Sharing
- **JWT:** JSON Web Token (authentication)
- **CDN:** Content Delivery Network

### 8.3 Contact & Support

**Technical Ownership:**
- CTO: [Redacted]
- Lead Backend Engineer: [Redacted]
- DevOps Lead: [Redacted]
- Security Lead: [Redacted]

**Emergency Contacts:**
- On-Call Engineer: [PagerDuty rotation]
- Incident Response: [Slack: #incidents]
- Security Incidents: [Email: security@ksigadgets.com]

---

## Document Control

**Version History:**
- v2.0 - February 10, 2026 - Complete architecture redesign for scale
- v1.5 - January 2026 - Added Redis and flash sale architecture
- v1.0 - December 2025 - Initial architecture document

**Review Schedule:** Quarterly (March, June, September, December)

**Next Review Date:** May 10, 2026

---

**Document Classification:** Internal - Technical Specification  
**Distribution:** Engineering Team, Product Team, Executive Team

---

*This document represents the technical vision and implementation strategy for KSI GADGETS platform as of February 2026. All specifications are subject to change based on business requirements and technological advancements.*
