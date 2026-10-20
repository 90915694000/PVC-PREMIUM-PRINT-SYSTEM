require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// --- MONGODB CONNECTION ---
let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        isConnected = true;
    } catch (error) { console.error('MongoDB Connection Error:', error); }
};

// --- MONGODB SCHEMA ---
const orderSchema = new mongoose.Schema({
    customerName: String, mobile: String, email: String, serviceType: String,
    frontImage: String, backImage: String, quantity: Number, price: Number, instructions: String,
    status: { type: String, default: 'Pending' }, paymentState: { type: String, default: 'Pending' },
    trackingId: String, createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// --- ADMIN API ROUTES ---
app.get('/admin/api/orders', async (req, res) => {
    await connectDB();
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/admin/api/orders/:id', async (req, res) => {
    await connectDB();
    try {
        const { status, paymentState } = req.body;
        await Order.findByIdAndUpdate(req.params.id, { status, paymentState });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/admin/api/orders/:id', async (req, res) => {
    await connectDB();
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- ADMIN DASHBOARD UI (CLAYMORPHISM) ---
app.get('/admin', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Dashboard | PVC PREMIUM PRINT</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;800&display=swap" rel="stylesheet">
        <style>
            :root {
                --bg: #e0e5ec;
                --shadow-light: #ffffff;
                --shadow-dark: #a3b1c6;
            }
            body { margin: 0; padding: 20px; background: var(--bg); font-family: 'Poppins', sans-serif; color: #333; }
            .header { text-align: center; margin-bottom: 40px; }
            .clay-card {
                background: var(--bg); border-radius: 24px; padding: 20px;
                box-shadow: 9px 9px 16px var(--shadow-dark), -9px -9px 16px var(--shadow-light); margin-bottom: 20px;
            }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
            .stat-card { text-align: center; }
            .stat-value { font-size: 2.5em; font-weight: 800; color: #007BFF; }
            
            .table-wrapper { overflow-x: auto; }
            table { width: 100%; border-collapse: collapse; min-width: 900px; }
            th, td { padding: 15px; text-align: left; }
            th { box-shadow: inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light); border-radius: 12px; }
            tr { border-bottom: 1px solid #d1d9e6; }
            
            .clay-select, .clay-btn {
                background: var(--bg); border-radius: 12px; border: none; padding: 8px 12px; outline: none; font-family: inherit;
                box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
            }
            .clay-btn {
                box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
                cursor: pointer; font-weight: 600; transition: 0.2s;
            }
            .clay-btn:active { box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light); }
            .btn-danger { background: #ff7675; color: white; }
            .btn-view { background: #74b9ff; color: white; text-decoration: none; padding: 5px 10px; border-radius:8px;}
            
            .filters { display: flex; gap: 10px; margin-bottom: 20px; }
        </style>
    </head>
    <body>

    <div class="header">
        <h1>🛠️ Store Management Center</h1>
        <p><b>PVC PREMIUM PRINT</b> | MD SAYEM HOSSAIN</p>
    </div>

    <div class="stats-grid">
        <div class="clay-card stat-card"><div class="stat-value" id="totOrders">0</div><div>Total Orders</div></div>
        <div class="clay-card stat-card"><div class="stat-value" id="pendPrints" style="color:#e17055;">0</div><div>Pending Prints</div></div>
        <div class="clay-card stat-card"><div class="stat-value" id="compOrders" style="color:#00b894;">0</div><div>Completed</div></div>
        <div class="clay-card stat-card"><div class="stat-value" id="totRev" style="color:#6c5ce7;">₹0</div><div>Total Revenue</div></div>
    </div>

    <div class="clay-card">
        <div class="filters">
            <button class="clay-btn" onclick="renderTable('All')">All Orders</button>
            <button class="clay-btn" onclick="renderTable('Pending')">Pending</button>
            <button class="clay-btn" onclick="renderTable('In Printing')">In Printing</button>
            <button class="clay-btn" onclick="renderTable('Completed')">Completed</button>
        </div>

        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Tracking ID</th>
                        <th>Customer</th>
                        <th>Service</th>
                        <th>Images</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="orderTable">
                    <!-- Dynamic Data -->
                </tbody>
            </table>
        </div>
    </div>

    <script>
        let allOrders = [];

        async function fetchOrders() {
            const res = await fetch('/admin/api/orders');
            const data = await res.json();
            if(data.success) {
                allOrders = data.orders;
                calculateStats();
                renderTable('All');
            }
        }

        function calculateStats() {
            document.getElementById('totOrders').innerText = allOrders.length;
            document.getElementById('pendPrints').innerText = allOrders.filter(o => o.status === 'Pending').length;
            document.getElementById('compOrders').innerText = allOrders.filter(o => o.status === 'Dispatched' || o.status === 'Ready for Pickup').length;
            const rev = allOrders.reduce((sum, o) => sum + (o.price || 0), 0);
            document.getElementById('totRev').innerText = '₹' + rev;
        }

        function renderTable(filter) {
            const tbody = document.getElementById('orderTable');
            tbody.innerHTML = '';
            
            let filtered = allOrders;
            if(filter !== 'All') {
                if(filter === 'Completed') {
                    filtered = allOrders.filter(o => o.status === 'Ready for Pickup' || o.status === 'Dispatched');
                } else {
                    filtered = allOrders.filter(o => o.status === filter);
                }
            }

            filtered.forEach(order => {
                const tr = document.createElement('tr');
                tr.innerHTML = \`
                    <td><b>\${order.trackingId}</b><br><small>\${new Date(order.createdAt).toLocaleDateString()}</small></td>
                    <td>\${order.customerName}<br>📞 \${order.mobile}</td>
                    <td>\${order.serviceType} (x\${order.quantity})<br><b style="color:#6c5ce7">₹\${order.price}</b></td>
                    <td>
                        <a href="\${order.frontImage}" target="_blank" class="btn-view">Front</a>
                        \${order.backImage ? \`<a href="\${order.backImage}" target="_blank" class="btn-view">Back</a>\` : ''}
                    </td>
                    <td>
                        <select class="clay-select" onchange="updateOrder('\${order._id}', 'status', this.value)">
                            <option value="Pending" \${order.status==='Pending'?'selected':''}>Pending</option>
                            <option value="In Printing" \${order.status==='In Printing'?'selected':''}>In Printing</option>
                            <option value="Quality Check" \${order.status==='Quality Check'?'selected':''}>Quality Check</option>
                            <option value="Ready for Pickup" \${order.status==='Ready for Pickup'?'selected':''}>Ready for Pickup</option>
                            <option value="Dispatched" \${order.status==='Dispatched'?'selected':''}>Dispatched</option>
                        </select>
                    </td>
                    <td>
                        <select class="clay-select" onchange="updateOrder('\${order._id}', 'paymentState', this.value)">
                            <option value="Pending" \${order.paymentState==='Pending'?'selected':''}>Pending</option>
                            <option value="Paid" \${order.paymentState==='Paid'?'selected':''}>Paid</option>
                        </select>
                    </td>
                    <td>
                        <button class="clay-btn btn-danger" onclick="deleteOrder('\${order._id}')">Delete</button>
                    </td>
                \`;
                tbody.appendChild(tr);
            });
        }

        async function updateOrder(id, field, value) {
            const order = allOrders.find(o => o._id === id);
            order[field] = value;
            await fetch('/admin/api/orders/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: order.status, paymentState: order.paymentState })
            });
            calculateStats();
        }

        async function deleteOrder(id) {
            if(!confirm('Are you sure you want to delete this order?')) return;
            await fetch('/admin/api/orders/' + id, { method: 'DELETE' });
            fetchOrders();
        }

        fetchOrders();
    </script>
    </body>
    </html>
    `);
});

// Vercel Serverless Export
module.exports = app;

if(process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => console.log(`Admin Server running on port ${PORT}`));
}
