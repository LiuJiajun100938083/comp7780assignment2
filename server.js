const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const session = require('express-session');

const app = express();
const PORT = 3005;

// MySQL 连接信息
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'liujiajun',
    database: 'greenworld_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 中间件配置
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 使用 session 中间件
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24小时
}));

// 初始化数据库：创建所需的表并插入示例数据
async function initDB() {
    try {
        // 创建 products 表
        await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        product_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        original_price DECIMAL(10,2),
        discounted_price DECIMAL(10,2),
        image_url VARCHAR(255),
        stock INT DEFAULT 0
      )
    `);
        console.log("Products table created or already exists.");

        // 检查并插入示例产品（如果表中没有数据）
        let [rows] = await pool.query("SELECT COUNT(*) as count FROM products");
        if (rows[0].count === 0) {
            const insertProduct = `
        INSERT INTO products (name, original_price, discounted_price, image_url, stock) VALUES 
        ('City Cruiser', 29999, 10000, '截圖 2025-03-05 15.08.10.png', 10),
        ('Mountain Explorer', 29999, 10000, '截圖 2025-03-05 15.08.42.png', 20),
        ('Speedster Pro', 29999, 10000, '截圖 2025-03-05 15.09.07.png', 15)
      `;
            await pool.query(insertProduct);
            console.log("Inserted sample products with stock.");
        }

        // 创建 users 表
        await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE,
        password VARCHAR(255),
        role ENUM('customer','admin') DEFAULT 'customer'
      )
    `);
        console.log("Users table created or already exists.");
        [rows] = await pool.query("SELECT COUNT(*) as count FROM users WHERE username='admin'");
        if (rows[0].count === 0) {
            await pool.query("INSERT INTO users (username, password, role) VALUES ('admin', 'admin', 'admin')");
            console.log("Admin record inserted (username: admin, password: admin).");
        }

        // 创建 cart_items 表
        await pool.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        product_id INT,
        quantity INT,
        FOREIGN KEY(user_id) REFERENCES users(user_id),
        FOREIGN KEY(product_id) REFERENCES products(product_id)
      )
    `);
        console.log("Cart items table created or already exists.");
    } catch (err) {
        console.error("Error during DB initialization:", err.message);
    }
}

initDB();

// ---------- API 接口 ----------

// 获取当前登录用户信息
app.get('/api/currentUser', (req, res) => {
    if (req.session && req.session.user) res.json({ user: req.session.user });
    else res.json({ user: null });
});

// 用户注册接口
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.json({ error: 'Username and password are required.' });
        let [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length > 0) return res.json({ error: 'Username already exists.' });
        await pool.query('INSERT INTO users (username, password, role) VALUES (?,?,?)', [username, password, 'customer']);
        res.json({ message: 'Registration successful. You can now log in.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 用户登录接口（普通用户）
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.json({ error: 'Username and password are required.' });
        let [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.json({ error: 'User not found.' });
        const user = rows[0];
        if (password !== user.password) return res.json({ error: 'Incorrect password.' });
        req.session.user = user;
        res.json({ message: `User ${username} logged in successfully.`, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 管理员登录接口
app.post('/api/adminLogin', async (req, res) => {
    try {
        const { username, password } = req.body;
        let [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND role = "admin"', [username]);
        if (rows.length === 0) return res.json({ error: 'Admin not found.' });
        const admin = rows[0];
        if (password !== admin.password) return res.json({ error: 'Incorrect admin password.' });
        req.session.user = admin;
        res.json({ message: `Admin ${username} logged in successfully.`, user: admin });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 登出接口
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) res.status(500).json({ error: 'Failed to logout.' });
        else res.json({ message: 'Logout successful.' });
    });
});

// 获取所有商品接口（包含库存信息）
app.get('/api/products', async (req, res) => {
    try {
        let [rows] = await pool.query("SELECT * FROM products");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------- 购物车 API（使用 MySQL 存储购物车数据） ----------

// 添加商品到购物车（存在则更新数量，并检查库存）
app.post('/api/cart/add', async (req, res) => {
    try {
        if (!req.session.user) return res.status(401).json({ error: "Not logged in." });
        const userId = req.session.user.user_id;
        const { product_id, quantity } = req.body;
        const qty = parseInt(quantity) || 1;

        // 查询产品库存
        let [prodRows] = await pool.query("SELECT stock FROM products WHERE product_id = ?", [product_id]);
        if (prodRows.length === 0) return res.json({ error: "Product not found." });
        const availableStock = prodRows[0].stock;

        // 查询购物车中是否已有该商品
        let [cartRows] = await pool.query("SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?", [userId, product_id]);
        let newQty = qty;
        if (cartRows.length > 0) {
            newQty = cartRows[0].quantity + qty;
        }
        // 检查库存限制
        if (newQty > availableStock) {
            return res.json({ error: "Requested quantity exceeds available stock." });
        }
        if (cartRows.length > 0) {
            await pool.query("UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?", [newQty, cartRows[0].cart_item_id]);
            res.json({ message: "Cart updated." });
        } else {
            await pool.query("INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?,?,?)", [userId, product_id, newQty]);
            res.json({ message: "Product added to cart." });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 获取购物车详情
app.get('/api/cart', async (req, res) => {
    try {
        if (!req.session.user) return res.status(401).json({ error: "Not logged in." });
        const userId = req.session.user.user_id;
        let [rows] = await pool.query(`
      SELECT c.cart_item_id, c.product_id, c.quantity, p.name, p.discounted_price, p.stock
      FROM cart_items c 
      JOIN products p ON c.product_id = p.product_id
      WHERE c.user_id = ?
    `, [userId]);
        let total = 0;
        const items = rows.map(item => {
            if (item.quantity > item.stock) {
                item.stock_error = true;
            }
            const subtotal = item.discounted_price * item.quantity;
            total += subtotal;
            return { ...item, subtotal };
        });
        res.json({ items, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 更新购物车中商品数量，检查库存
app.post('/api/cart/update', async (req, res) => {
    try {
        if (!req.session.user) return res.status(401).json({ error: "Not logged in." });
        const userId = req.session.user.user_id;
        const { product_id, quantity } = req.body;
        const qty = parseInt(quantity);
        // 查询产品库存
        let [prodRows] = await pool.query("SELECT stock FROM products WHERE product_id = ?", [product_id]);
        if (prodRows.length === 0) return res.json({ error: "Product not found." });
        const availableStock = prodRows[0].stock;
        if (qty > availableStock) {
            return res.json({ error: "Requested quantity exceeds available stock." });
        }
        if (qty <= 0) {
            await pool.query("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?", [userId, product_id]);
            return res.json({ message: "Cart item removed." });
        } else {
            await pool.query("UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?", [qty, userId, product_id]);
            res.json({ message: "Cart updated." });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 删除购物车中商品
app.post('/api/cart/delete', async (req, res) => {
    try {
        if (!req.session.user) return res.status(401).json({ error: "Not logged in." });
        const userId = req.session.user.user_id;
        const { product_id } = req.body;
        await pool.query("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?", [userId, product_id]);
        res.json({ message: "Product removed from cart." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------- 管理员产品管理接口 ----------

// 添加商品（含库存）
app.post('/api/admin/add', async (req, res) => {
    try {
        const { name, original_price, discounted_price, image_url, stock } = req.body;
        await pool.query('INSERT INTO products (name, original_price, discounted_price, image_url, stock) VALUES (?,?,?,?,?)', [name, original_price, discounted_price, image_url, stock]);
        res.json({ message: 'Product added successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 删除商品
app.post('/api/admin/delete', async (req, res) => {
    try {
        const { product_id } = req.body;
        await pool.query('DELETE FROM products WHERE product_id = ?', [product_id]);
        res.json({ message: 'Product deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 更新商品（含库存）
app.post('/api/admin/update', async (req, res) => {
    try {
        const { product_id, name, original_price, discounted_price, image_url, stock } = req.body;
        await pool.query('UPDATE products SET name = ?, original_price = ?, discounted_price = ?, image_url = ?, stock = ? WHERE product_id = ?', [name, original_price, discounted_price, image_url, stock, product_id]);
        res.json({ message: 'Product updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 结算接口：检查库存、减少库存并清空购物车
app.post('/api/checkout', async (req, res) => {
    try {
        if (!req.session.user) return res.status(401).json({ error: "Not logged in." });
        const userId = req.session.user.user_id;
        let [rows] = await pool.query(`
      SELECT c.cart_item_id, c.product_id, c.quantity, p.stock
      FROM cart_items c 
      JOIN products p ON c.product_id = p.product_id
      WHERE c.user_id = ?
    `, [userId]);
        for (let item of rows) {
            if (item.stock < item.quantity) {
                return res.json({ error: `Insufficient stock for product ID ${item.product_id}` });
            }
        }
        // 更新库存
        for (let item of rows) {
            await pool.query("UPDATE products SET stock = stock - ? WHERE product_id = ?", [item.quantity, item.product_id]);
        }
        await pool.query("DELETE FROM cart_items WHERE user_id = ?", [userId]);
        res.json({ message: "Checkout successful. Your order has been placed." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 示例结算页面接口（模仿老师例子，集成 PayPal 按钮）
app.get('/check_out', async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.send("You must be logged in to check out.");
        }
        const userId = req.session.user.user_id;
        let [rows] = await pool.query(`
      SELECT c.cart_item_id, c.product_id, c.quantity, p.name, p.discounted_price
      FROM cart_items c 
      JOIN products p ON c.product_id = p.product_id
      WHERE c.user_id = ?
    `, [userId]);
        if (rows.length === 0) return res.send("Your cart is empty.");

        let total_due = 0;
        let tableRows = '';
        rows.forEach(item => {
            let subtotal = item.quantity * item.discounted_price;
            total_due += subtotal;
            tableRows += `<tr>
          <td>${item.product_id}</td>
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>${item.discounted_price}</td>
          <td>${subtotal.toFixed(2)}</td>
      </tr>`;
        });

        let responseText = '<!DOCTYPE html><html lang="en"><head>';
        responseText += '<meta name="viewport" content="width=device-width, initial-scale=1">';
        responseText += '<meta http-equiv="X-UA-Compatible" content="IE=edge" />';
        responseText += '<title>Checkout - Green World Online Shop</title>';
        responseText += '</head><body>';
        responseText += `<h1>Thank you for your order, ${req.session.user.username}!</h1>`;
        responseText += '<p>Your order details:</p>';
        responseText += '<table border="1" style="width:100%; border-collapse:collapse;">';
        responseText += '<tr><th>Product ID</th><th>Product Name</th><th>Quantity</th><th>Price</th><th>Amount</th></tr>';
        responseText += tableRows;
        responseText += '</table>';
        responseText += `<p><strong>Total Due: HKD ${total_due.toFixed(2)}</strong></p>`;
        responseText += '<script src="https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID"></script>';
        responseText += '<div id="paypal-button-container"></div>';
        responseText += '<p id="paypal-message"></p>';
        responseText += '<script>';
        responseText += 'paypal.Buttons({';
        responseText += 'createOrder: function(data, actions) {';
        responseText += 'return actions.order.create({';
        responseText += 'purchase_units: [{';
        responseText += 'amount: { value: "' + total_due.toFixed(2) + '" }';
        responseText += '}]';
        responseText += '});';
        responseText += '},';
        responseText += 'onApprove: function(data, actions) {';
        responseText += 'return actions.order.capture().then(function(details) {';
        responseText += 'alert("Transaction completed by " + details.payer.name.given_name);';
        responseText += 'document.querySelector("#paypal-message").innerHTML = "Payment has completed! This page can now be closed.";';
        responseText += '});';
        responseText += '}';
        responseText += '}).render("#paypal-button-container");';
        responseText += '</script>';
        responseText += '</body></html>';
        res.send(responseText);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});