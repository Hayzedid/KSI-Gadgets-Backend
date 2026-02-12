# KSI Gadgets E-Commerce Backend

A fully-featured e-commerce backend API built with Node.js, TypeScript, Express, and PostgreSQL.

## 🚀 Features

### Core Features
- ✅ User Management (Registration, Profile, Admin)
- ✅ JWT Authentication & Authorization
- ✅ Product Management (CRUD, Search, Filtering)
- ✅ Shopping Cart (Add, Update, Remove, Clear)
- ✅ Order Management (Create, Track, Cancel, History)
- ✅ **Email Services (Welcome, Password Reset, Order Confirmations)**
- ✅ Reviews & Ratings
- ✅ Role-Based Access Control (Customer, Admin)

### Technical Features
- TypeScript for type safety
- PostgreSQL with TypeORM
- JWT token-based authentication
- Input validation with express-validator
- Professional error handling
- Secure password hashing (bcrypt)
- RESTful API design
- **HTML email templates with Nodemailer**

## 📧 Email Services

The platform includes comprehensive email functionality:

- **Welcome Emails** - Sent on user registration
- **Password Reset** - Secure token-based password recovery
- **Order Confirmations** - Detailed order receipts
- **Order Status Updates** - Notifications for status changes
- **Password Change Confirmations** - Security notifications

See [EMAIL_SERVICE.md](EMAIL_SERVICE.md) for complete documentation.

## 🛠️ Quick Start

### Prerequisites
- Node.js (v16+)
- PostgreSQL (v12+)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
cd Backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
# Important: Set up email credentials (see EMAIL_QUICKSTART.md)
```

4. **Set up database**
```bash
# Create database
createdb ksi_gadgets

# Run migrations (if using TypeORM migrations)
npm run migration:run

# OR enable auto-sync in development (see EMAIL_MIGRATION.md)
```

5. **Start development server**
```bash
npm run dev
```

Server will start on http://localhost:5000

## 📚 Documentation

- [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) - Complete feature list
- [EMAIL_SERVICE.md](EMAIL_SERVICE.md) - Email service documentation
- [EMAIL_QUICKSTART.md](EMAIL_QUICKSTART.md) - Quick email setup guide
- [EMAIL_MIGRATION.md](EMAIL_MIGRATION.md) - Database migration for emails
- [GETTING_STARTED.md](GETTING_STARTED.md) - Detailed setup guide
- [API.md](docs/API.md) - API documentation

## 🔑 Environment Variables

Key environment variables (see `.env.example`):

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_NAME=ksi_gadgets
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_secret_key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Email (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@ksi-gadgets.com

# Client
CLIENT_URL=http://localhost:3000
```

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/request-password-reset` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/verify-reset-token` - Verify reset token

### Users
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/account` - Delete user account
- `GET /api/users` - Get all users (Admin)
- `GET /api/users/:userId` - Get user by ID (Admin)

### Products
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)
- `GET /api/products/:id/reviews` - Get product reviews
- `POST /api/products/:id/reviews` - Add review

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/:productId` - Update cart item
- `DELETE /api/cart/items/:productId` - Remove item
- `DELETE /api/cart` - Clear cart

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders/my-orders` - Get user's orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders/:id/cancel` - Cancel order
- `GET /api/orders` - Get all orders (Admin)
- `PUT /api/orders/:id/status` - Update order status (Admin)

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📦 Scripts

```bash
npm run dev          # Start development server with nodemon
npm run build        # Build TypeScript to JavaScript
npm start            # Start production server
npm test             # Run tests
npm run migration:run    # Run database migrations
npm run migration:create # Create new migration
```

## 🏗️ Project Structure

```
Backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middlewares/     # Express middlewares
│   ├── models/          # TypeORM entities
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   │   └── email.service.ts  # Email service
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   └── validators/      # Input validators
├── tests/               # Test files
├── uploads/             # File uploads
├── logs/                # Application logs
└── .env                 # Environment variables
```

## 🔒 Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT token authentication
- Role-based authorization
- Input validation and sanitization
- SQL injection prevention (TypeORM)
- CORS configuration
- Secure password reset with token expiration
- Email enumeration prevention

## 🚀 Deployment

### Production Checklist

- [ ] Update environment variables for production
- [ ] Set `NODE_ENV=production`
- [ ] Use production database credentials
- [ ] Configure professional email service (SendGrid/Mailgun)
- [ ] Enable HTTPS
- [ ] Set up reverse proxy (Nginx)
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging
- [ ] Enable database backups
- [ ] Configure rate limiting

## 📝 License

ISC

## 👥 Author

KSI Gadgets Team

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📞 Support

For issues or questions:
- Create an issue in the repository
- Check existing documentation
- Review [EMAIL_QUICKSTART.md](EMAIL_QUICKSTART.md) for email setup help

---

**Status:** ✅ Production Ready

**Last Updated:** January 30, 2026
