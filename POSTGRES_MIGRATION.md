# PostgreSQL Migration Summary

## What Changed

The backend has been migrated from **MongoDB (Mongoose)** to **PostgreSQL (TypeORM)**.

## Key Changes

### 1. Dependencies
- ❌ Removed: `mongoose`
- ✅ Added: `typeorm`, `pg`, `reflect-metadata`

### 2. Database Configuration

**Before (MongoDB):**
```typescript
mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/ksi-gadgets"
```

**After (PostgreSQL):**
```typescript
dbHost: process.env.DB_HOST || "localhost"
dbPort: process.env.DB_PORT || 5432
dbName: process.env.DB_NAME || "ksi_gadgets"
dbUser: process.env.DB_USER || "postgres"
dbPassword: process.env.DB_PASSWORD || "postgres"
```

### 3. User Model

**Before (Mongoose Schema):**
- Used `@Schema()` decorator and Mongoose Document
- ObjectId `_id` field
- Schema-based validation

**After (TypeORM Entity):**
- Used TypeORM decorators: `@Entity`, `@Column`, `@PrimaryGeneratedColumn`
- UUID `id` field (better for distributed systems)
- Entity-based model with hooks (`@BeforeInsert`, `@BeforeUpdate`)

### 4. Database Operations

**Mongoose → TypeORM Equivalents:**

| Mongoose | TypeORM |
|----------|---------|
| `User.findOne({ email })` | `userRepository.findOne({ where: { email } })` |
| `User.findById(id)` | `userRepository.findOne({ where: { id } })` |
| `User.create(data)` | `userRepository.create(data)` + `userRepository.save(user)` |
| `user.save()` | `userRepository.save(user)` |
| `User.findByIdAndDelete(id)` | `userRepository.remove(user)` |
| `.select('+password')` | `select: ['id', 'password', ...]` |
| `.sort({ createdAt: -1 })` | `order: { createdAt: 'DESC' }` |
| `.skip().limit()` | `skip` and `take` |

### 5. TypeScript Configuration

Added to `tsconfig.json`:
```json
{
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true,
  "strictPropertyInitialization": false
}
```

## Environment Variables

Update your `.env` file:

```env
# Replace MongoDB connection
# MONGO_URI=mongodb://localhost:27017/ksi-gadgets

# With PostgreSQL connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ksi_gadgets
DB_USER=postgres
DB_PASSWORD=postgres
```

## Setup PostgreSQL

### Install PostgreSQL

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- Or use: `winget install PostgreSQL.PostgreSQL`

**Using Docker:**
```bash
docker run --name postgres-ksi -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
```

### Create Database

```bash
# Using psql
psql -U postgres
CREATE DATABASE ksi_gadgets;
\q
```

Or use pgAdmin or any PostgreSQL GUI tool.

## What Works the Same

✅ All API endpoints remain unchanged
✅ Authentication & Authorization logic unchanged
✅ JWT token system unchanged
✅ Password hashing unchanged
✅ Validation rules unchanged
✅ Business logic unchanged

## Benefits of PostgreSQL

1. **ACID Compliance** - Better data integrity
2. **Relational Data** - Better for complex relationships (orders, products, etc.)
3. **Performance** - Better for complex queries and joins
4. **UUID Support** - Better for distributed systems
5. **JSON Support** - Can still store JSON data (used for address field)
6. **Type Safety** - TypeORM provides compile-time type checking

## Next Steps

1. Install dependencies: `npm install`
2. Update `.env` file with PostgreSQL credentials
3. Start PostgreSQL server
4. Run the application: `npm run dev`
5. TypeORM will automatically create tables on first run (development mode)

## Production Considerations

For production:
- Set `synchronize: false` in database config
- Use migrations instead: `npm run typeorm migration:generate`
- Set up proper database backups
- Use connection pooling
- Configure SSL for database connections
