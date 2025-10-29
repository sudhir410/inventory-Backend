# Database Scripts

This directory contains scripts for managing the database.

## Available Scripts

### 1. Create Admin User (`createAdmin.js`)

Creates an initial admin user for the system.

**Usage:**
```bash
cd backend
node scripts/createAdmin.js
```

**Default Credentials:**
- Email: `admin@sanjayhardware.com`
- Password: `admin123`
- Role: `admin`

---

### 2. Seed Database (`seedData.js`)

Populates the database with sample data for testing and development.

**⚠️ WARNING:** This script will **DELETE ALL EXISTING DATA** before inserting new data.

**Usage:**
```bash
cd backend
node scripts/seedData.js
```

**What it creates:**
- **3 Users:**
  - Admin: `admin@sanjayhardware.com` (password: `admin123`)
  - Manager: `manager@sanjayhardware.com` (password: `manager123`)
  - Employee: `employee@sanjayhardware.com` (password: `employee123`)

- **10 Products:** Various hardware items including cement, steel rods, paint, tools, etc.

- **5 Customers:** Mix of retail and wholesale customers

- **3 Sales:** Sample sales transactions with different payment statuses

- **2 Payments:** Sample payment records

---

## Prerequisites

1. **MongoDB must be running:**
   ```bash
   # For macOS (using Homebrew)
   brew services start mongodb-community
   
   # For Linux
   sudo systemctl start mongod
   
   # For Windows
   # Start MongoDB service from Services panel
   ```

2. **Environment variables must be set:**
   - Make sure `.env` file exists in the `backend` directory
   - Ensure `MONGODB_URI` and `JWT_SECRET` are configured

---

## Quick Start

To set up a fresh database with sample data:

```bash
# 1. Navigate to backend directory
cd backend

# 2. Make sure MongoDB is running
brew services start mongodb-community  # macOS

# 3. Run the seed script
node scripts/seedData.js

# 4. Start the backend server
npm run dev
```

---

## Notes

- The seed script is idempotent for the admin user (won't create duplicates)
- All passwords are hashed using bcrypt before storage
- Sample data includes realistic Indian hardware shop inventory
- Use these credentials to log in and test the application

