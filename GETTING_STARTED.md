# KSI-GADGETS Backend - Getting Started

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the Backend directory by copying the example:

```bash
copy .env.example .env
```

Then update the `.env` file with your actual configuration:

- Set a strong `JWT_SECRET`
- Configure your PostgreSQL connection in `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Set up email credentials if you want to use email features

### 3. Start PostgreSQL

Make sure PostgreSQL is running on your system and create the database:

```bash
# Using psql command line
psql -U postgres
CREATE DATABASE ksi_gadgets;
\q
```

Or use pgAdmin or any PostgreSQL GUI tool to create the database.

### 4. Run the Application

**Development mode (with auto-reload):**

```bash
npm run dev
```

**Production mode:**

```bash
npm run build
npm start
```

## Features Implemented

### ✅ User Management

- User registration with validation
- User login with JWT authentication
- User profile management (view, update, delete)
- Password management (change password)
- Admin user management (view all users, update roles, delete users)

### ✅ Authentication & Authorization

- JWT-based authentication (access & refresh tokens)
- Role-based access control (Admin, Customer)
- Token refresh mechanism
- Password reset functionality
- Secure password hashing with bcrypt
- Protected routes with authentication middleware
- Role-based authorization middleware

## API Endpoints

### Authentication Routes (`/api/auth`)

- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /refresh-token` - Refresh access token
- `POST /logout` - Logout user (requires auth)
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token
- `POST /change-password` - Change password (requires auth)
- `GET /me` - Get current user (requires auth)

### User Routes (`/api/users`)

- `GET /profile` - Get user profile (requires auth)
- `PUT /profile` - Update user profile (requires auth)
- `DELETE /account` - Delete user account (requires auth)
- `GET /` - Get all users (requires admin)
- `GET /:id` - Get user by ID (requires admin)
- `PATCH /:id/role` - Update user role (requires admin)
- `DELETE /:id` - Delete user (requires admin)

## Project Structure

```
src/
├── config/          # Configuration files (env, database, logger)
├── constants/       # Constants (HTTP status codes, messages)
├── controllers/     # Request handlers
├── middlewares/     # Custom middleware (auth, validation, error handling)
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions (JWT, password, error handling)
├── validators/      # Request validation schemas
├── app.ts           # Express app setup
└── server.ts        # Server entry point
```

## Next Steps

To complete the full e-commerce platform, you can implement:

1. Product Management
2. Shopping Cart
3. Order Management
4. Payment Integration
5. Email Service
6. File Upload for Product Images

## Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- Rate limiting middleware
- Error handling middleware
- Role-based access control

## Notes

- Database: PostgreSQL with TypeORM
- All passwords must be at least 6 characters and contain uppercase, lowercase, and numbers
- JWT access tokens expire in 15 minutes (configurable)
- JWT refresh tokens expire in 7 days (configurable)
- Admin users can manage all users and their roles
- TypeORM will automatically create database tables in development mode (synchronize: true)
