require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const User = require('./models/User');
const MenuItem = require('./models/MenuItem');
const Combo = require('./models/Combo');
const Order = require('./models/Order');
const Feedback = require('./models/Feedback');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/canteen';
const PUBLIC_ROOT_FILES = new Set([
  'add_user.html',
  'admin_dashboard.html',
  'dashboard.html',
  'feedback.html',
  'format_money.js',
  'home.html',
  'login.html',
  'manage_combo.html',
  'manage_menu.html',
  'manage_orders.html',
  'modern_luxe.css',
  'order.html',
  'register.html',
  'status.html'
]);

// Middleware
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

function isPublicStaticRequest(requestPath) {
  if (requestPath === '/') return true;

  const normalizedPath = path.normalize(requestPath).replace(/^([/\\])+/, '');
  const parts = normalizedPath.split(/[\\/]/);

  if (parts.includes('..')) return false;
  if (parts.length === 1) return PUBLIC_ROOT_FILES.has(parts[0]);

  return parts[0] === 'images';
}

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();

  let requestPath;
  try {
    requestPath = decodeURIComponent(req.path);
  } catch (err) {
    return res.status(400).send('Bad request');
  }

  if (!isPublicStaticRequest(requestPath)) {
    return res.status(404).send('Not found');
  }

  next();
});

// Serve only approved frontend files, not backend source or config files.
app.use(express.static(path.join(__dirname), {
  dotfiles: 'ignore',
  index: false,
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Check whether the database server is running.');
});

// Connect to MongoDB
async function connectDatabase() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('Connected to MongoDB successfully.');
    await seedDefaultData();
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    console.error('Set MONGO_URI in .env, or start MongoDB locally at mongodb://localhost:27017/canteen');
    process.exit(1);
  }
}

// Seed default users, combos and menu items if database is empty
async function seedDefaultData() {
  try {
    // 1. Seed Users
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.insertMany([
        { username: '123', password: '123', role: 'student' },
        { username: 'admin123', password: '123', role: 'admin' }
      ]);
      console.log('Default users seeded successfully.');
    }

    // 2. Seed Combos (if none exist)
    const comboCount = await Combo.countDocuments();
    if (comboCount === 0) {
      await Combo.insertMany([
        {
          name: 'Super Saver Burger Combo',
          items: 'Burger, French Fries, Coca Cola',
          price: 149,
          img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
        },
        {
          name: 'Healthy Morning Combo',
          items: 'Idly (2 Pcs), Vada (1 Pc), Filter Coffee',
          price: 69,
          img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500'
        }
      ]);
      console.log('Default combos seeded.');
    }

    // 3. Seed any missing default menu items without duplicating existing rows.
    const defaultMenuItems = [
      { name: 'Idly', price: 30, category: 'breakfast' },
      { name: 'Dosa', price: 40, category: 'breakfast' },
      { name: 'Vada', price: 25, category: 'breakfast' },
      { name: 'Poori', price: 35, category: 'breakfast' },
      { name: 'Pongal', price: 40, category: 'breakfast' },
      { name: 'Masala Dosa', price: 50, category: 'breakfast' },
      { name: 'Full Meals', price: 80, category: 'lunch' },
      { name: 'Veg Biryani', price: 90, category: 'lunch' },
      { name: 'Fried Rice', price: 70, category: 'lunch' },
      { name: 'Paneer Butter Masala', price: 120, category: 'lunch' },
      { name: 'Tea', price: 10, category: 'tea' },
      { name: 'Coffee', price: 15, category: 'tea' },
      { name: 'Samosa', price: 20, category: 'tea' }
    ];

    const menuSeedResults = await Promise.all(defaultMenuItems.map(item =>
      MenuItem.updateOne(
        { name: item.name, category: item.category },
        { $setOnInsert: item },
        { upsert: true }
      )
    ));
    const insertedMenuItems = menuSeedResults.filter(result => result.upsertedCount > 0).length;
    if (insertedMenuItems > 0) {
      console.log(`Seeded ${insertedMenuItems} missing default menu items.`);
    }
  } catch (err) {
    console.error('Error seeding default database records:', err);
  }
}

/* ==========================================================================
   API ENDPOINTS
   ========================================================================== */

app.get('/api/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    server: 'ok',
    database: databaseConnected ? 'connected' : 'disconnected'
  });
});

// 1. Auth Endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
    res.json({ success: true, userId: user._id, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('_id username role').sort({ username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const newUser = new User({ username, password, role });
    await newUser.save();
    res.status(201).json({
      _id: newUser._id,
      username: newUser.username,
      role: newUser.role
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin user' });
      }
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Menu Item Endpoints
app.get('/api/menu', async (req, res) => {
  try {
    const menuItems = await MenuItem.find();
    res.json(menuItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/menu', async (req, res) => {
  const { name, price, category } = req.body;
  try {
    const newItem = new MenuItem({ name, price: Number(price), category });
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/menu/:id', async (req, res) => {
  const { name, price, category } = req.body;
  try {
    const updated = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { name, price: Number(price), category },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/menu/:id', async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Combo Endpoints
app.get('/api/combos', async (req, res) => {
  try {
    const combos = await Combo.find();
    res.json(combos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/combos', async (req, res) => {
  const { name, items, price, img } = req.body;
  try {
    const newCombo = new Combo({ name, items, price: Number(price), img });
    await newCombo.save();
    res.status(201).json(newCombo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/combos/:id', async (req, res) => {
  const { name, items, price, img } = req.body;
  try {
    const updated = await Combo.findByIdAndUpdate(
      req.params.id,
      { name, items, price: Number(price), img },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/combos/:id', async (req, res) => {
  try {
    await Combo.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Combo deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Order Endpoints
app.get('/api/orders', async (req, res) => {
  const { user } = req.query;
  try {
    const filter = user ? { user } : {};
    // Retrieve newest orders first
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const { id, userId, user, item, qty, status, price, payment } = req.body;
  try {
    const newOrder = new Order({
      orderId: id,
      userId,
      user,
      item,
      qty: Number(qty),
      status: status || 'Pending',
      price,
      payment: payment || 'Not Paid'
    });
    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  const { status, payment } = req.body;
  try {
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (payment !== undefined) {
      updateData.payment = payment;
      updateData.paidAt = payment === 'Paid' ? new Date() : null;
    }

    const updated = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Feedback Endpoints
app.get('/api/feedback', async (req, res) => {
  try {
    const feedbacks = await Feedback.find();
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feedback', async (req, res) => {
  const { username, rating, comment, time } = req.body;
  try {
    const newFeedback = new Feedback({ username, rating: Number(rating), comment, time });
    await newFeedback.save();
    res.status(201).json(newFeedback);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Default route redirect to home.html if path is empty
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});

connectDatabase().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });

  process.on('SIGTERM', () => {
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  });
});
