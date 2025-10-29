const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');
require('dotenv').config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hardware-inventory');
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Product.deleteMany({});
    await Customer.deleteMany({});
    await Sale.deleteMany({});
    await Payment.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // Create Users
    console.log('👤 Creating users...');
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@sanjayhardware.com',
      password: 'admin123',
      role: 'admin',
      phone: '9876543210',
      isActive: true
    });

    const managerUser = await User.create({
      name: 'Manager User',
      email: 'manager@sanjayhardware.com',
      password: 'manager123',
      role: 'manager',
      phone: '9876543211',
      isActive: true,
      createdBy: adminUser._id
    });

    const employeeUser = await User.create({
      name: 'Employee User',
      email: 'employee@sanjayhardware.com',
      password: 'employee123',
      role: 'employee',
      phone: '9876543212',
      isActive: true,
      createdBy: adminUser._id
    });

    console.log('✅ Created 3 users (admin, manager, employee)\n');

    // Create Products
    console.log('📦 Creating products...');
    const products = await Product.create([
      {
        name: 'Cement 50kg',
        sku: 'CEM-001',
        category: 'Building Materials',
        brand: 'UltraTech',
        description: 'High quality cement for construction',
        unit: 'bag',
        price: {
          purchase: 250,
          selling: 320,
          mrp: 350
        },
        stock: {
          current: 150,
          minimum: 20,
          maximum: 500
        },
        location: 'Warehouse A',
        barcode: '1234567890001',
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Steel Rod 12mm',
        sku: 'STL-002',
        category: 'Building Materials',
        brand: 'TATA',
        description: 'TMT steel rods for construction',
        unit: 'meter',
        price: {
          purchase: 45,
          selling: 55,
          mrp: 60
        },
        stock: {
          current: 500,
          minimum: 100,
          maximum: 1000
        },
        location: 'Warehouse B',
        barcode: '1234567890002',
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Paint 1L White',
        sku: 'PNT-003',
        category: 'Paints',
        brand: 'Asian Paints',
        description: 'Premium white emulsion paint',
        unit: 'liter',
        price: {
          purchase: 150,
          selling: 200,
          mrp: 250
        },
        stock: {
          current: 80,
          minimum: 20,
          maximum: 200
        },
        location: 'Store Room 1',
        barcode: '1234567890003',
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Door Handle Set',
        sku: 'HND-004',
        category: 'Hardware',
        brand: 'Godrej',
        description: 'Stainless steel door handle set',
        unit: 'set',
        price: {
          purchase: 80,
          selling: 120,
          mrp: 150
        },
        stock: {
          current: 75,
          minimum: 10,
          maximum: 150
        },
        location: 'Store Room 2',
        barcode: '1234567890004',
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Electrical Wire 1.5mm',
        sku: 'WIR-005',
        category: 'Electrical',
        brand: 'Havells',
        description: 'Copper electrical wire 1.5mm',
        unit: 'meter',
        price: {
          purchase: 25,
          selling: 35,
          mrp: 40
        },
        stock: {
          current: 1000,
          minimum: 200,
          maximum: 2000
        },
        location: 'Warehouse A',
        barcode: '1234567890005',
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Hammer 500g',
        sku: 'TLS-006',
        category: 'Tools',
        brand: 'Stanley',
        description: 'Professional claw hammer',
        unit: 'piece',
        price: {
          purchase: 200,
          selling: 280,
          mrp: 320
        },
        stock: {
          current: 30,
          minimum: 5,
          maximum: 50
        },
        location: 'Store Room 2',
        barcode: '1234567890006',
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'PVC Pipe 2 inch',
        sku: 'PLB-007',
        category: 'Plumbing',
        brand: 'Supreme',
        description: 'PVC pipe 2 inch diameter',
        unit: 'meter',
        price: {
          purchase: 40,
          selling: 55,
          mrp: 65
        },
        stock: {
          current: 300,
          minimum: 50,
          maximum: 500
        },
        location: 'Warehouse B',
        barcode: '1234567890007',
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Floor Tiles 2x2',
        sku: 'TIL-008',
        category: 'Tiles',
        brand: 'Kajaria',
        description: 'Ceramic floor tiles 2x2 feet',
        unit: 'box',
        price: {
          purchase: 300,
          selling: 400,
          mrp: 480
        },
        stock: {
          current: 120,
          minimum: 20,
          maximum: 200
        },
        location: 'Warehouse A',
        barcode: '1234567890008',
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Toilet Seat',
        sku: 'SAN-009',
        category: 'Sanitary',
        brand: 'Hindware',
        description: 'Western toilet seat with cover',
        unit: 'piece',
        price: {
          purchase: 1500,
          selling: 2000,
          mrp: 2500
        },
        stock: {
          current: 15,
          minimum: 3,
          maximum: 30
        },
        location: 'Store Room 1',
        barcode: '1234567890009',
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'LED Bulb 9W',
        sku: 'ELC-010',
        category: 'Electrical',
        brand: 'Philips',
        description: 'LED bulb 9 watt cool white',
        unit: 'piece',
        price: {
          purchase: 80,
          selling: 120,
          mrp: 150
        },
        stock: {
          current: 200,
          minimum: 50,
          maximum: 500
        },
        location: 'Store Room 2',
        barcode: '1234567890010',
        isActive: true,
        createdBy: adminUser._id
      }
    ]);

    console.log(`✅ Created ${products.length} products\n`);

    // Create Customers
    console.log('👥 Creating customers...');
    const customers = await Customer.create([
      {
        name: 'Rajesh Kumar',
        email: 'rajesh@example.com',
        phone: '9876543210',
        address: {
          street: '123 Main Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001'
        },
        customerType: 'retail',
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Priya Sharma',
        email: 'priya@example.com',
        phone: '9876543211',
        address: {
          street: '456 Park Avenue',
          city: 'Delhi',
          state: 'Delhi',
          zipCode: '110001'
        },
        customerType: 'retail',
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'ABC Builders Pvt Ltd',
        email: 'abc.builders@example.com',
        phone: '9876543212',
        address: {
          street: '789 Industrial Area',
          city: 'Pune',
          state: 'Maharashtra',
          zipCode: '411001'
        },
        customerType: 'wholesale',
        gstNumber: '27AABCU9603R1ZM',
        creditLimit: 500000,
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Suresh Patel',
        email: 'suresh@example.com',
        phone: '9876543213',
        address: {
          street: '321 Gandhi Road',
          city: 'Ahmedabad',
          state: 'Gujarat',
          zipCode: '380001'
        },
        customerType: 'retail',
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'XYZ Constructions',
        email: 'xyz.const@example.com',
        phone: '9876543214',
        address: {
          street: '555 Business Park',
          city: 'Bangalore',
          state: 'Karnataka',
          zipCode: '560001'
        },
        customerType: 'wholesale',
        gstNumber: '29AABCU9603R1ZN',
        creditLimit: 300000,
        isActive: true,
        createdBy: adminUser._id
      }
    ]);

    console.log(`✅ Created ${customers.length} customers\n`);

    // Create Sales
    console.log('💰 Creating sales...');
    const sales = await Sale.create([
      {
        invoiceNumber: 'INV-2024-001',
        customer: customers[0]._id,
        items: [
          {
            product: products[0]._id,
            quantity: 10,
            price: 320,
            total: 3200
          },
          {
            product: products[2]._id,
            quantity: 5,
            price: 200,
            total: 1000
          }
        ],
        subtotal: 4200,
        tax: 756,
        discount: 0,
        total: 4956,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        notes: 'First sale of the day',
        createdBy: employeeUser._id
      },
      {
        invoiceNumber: 'INV-2024-002',
        customer: customers[2]._id,
        items: [
          {
            product: products[1]._id,
            quantity: 100,
            price: 55,
            total: 5500
          },
          {
            product: products[4]._id,
            quantity: 200,
            price: 35,
            total: 7000
          }
        ],
        subtotal: 12500,
        tax: 2250,
        discount: 500,
        total: 14250,
        paymentMethod: 'credit',
        paymentStatus: 'partial',
        paidAmount: 10000,
        dueAmount: 4250,
        notes: 'Wholesale order - partial payment received',
        createdBy: managerUser._id
      },
      {
        invoiceNumber: 'INV-2024-003',
        customer: customers[1]._id,
        items: [
          {
            product: products[3]._id,
            quantity: 3,
            price: 120,
            total: 360
          },
          {
            product: products[9]._id,
            quantity: 10,
            price: 120,
            total: 1200
          }
        ],
        subtotal: 1560,
        tax: 280.8,
        discount: 0,
        total: 1840.8,
        paymentMethod: 'upi',
        paymentStatus: 'paid',
        notes: 'Quick sale',
        createdBy: employeeUser._id
      }
    ]);

    console.log(`✅ Created ${sales.length} sales\n`);

    // Create Payments
    console.log('💳 Creating payments...');
    const payments = await Payment.create([
      {
        receiptNumber: 'RCP-2024-001',
        customer: customers[2]._id,
        sale: sales[1]._id,
        amount: 10000,
        paymentMethod: 'bank_transfer',
        paymentDate: new Date(),
        notes: 'Partial payment for INV-2024-002',
        createdBy: managerUser._id
      },
      {
        receiptNumber: 'RCP-2024-002',
        customer: customers[0]._id,
        sale: sales[0]._id,
        amount: 4956,
        paymentMethod: 'cash',
        paymentDate: new Date(),
        notes: 'Full payment for INV-2024-001',
        createdBy: employeeUser._id
      }
    ]);

    console.log(`✅ Created ${payments.length} payments\n`);

    // Summary
    console.log('📊 ========================================');
    console.log('📊 SEED DATA SUMMARY');
    console.log('📊 ========================================');
    console.log(`👤 Users: ${3}`);
    console.log(`   - Admin: admin@sanjayhardware.com (password: admin123)`);
    console.log(`   - Manager: manager@sanjayhardware.com (password: manager123)`);
    console.log(`   - Employee: employee@sanjayhardware.com (password: employee123)`);
    console.log(`📦 Products: ${products.length}`);
    console.log(`👥 Customers: ${customers.length}`);
    console.log(`💰 Sales: ${sales.length}`);
    console.log(`💳 Payments: ${payments.length}`);
    console.log('📊 ========================================');
    console.log('✅ Seed data inserted successfully!');
    console.log('📊 ========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    console.error(error);
    process.exit(1);
  }
};

seedData();

