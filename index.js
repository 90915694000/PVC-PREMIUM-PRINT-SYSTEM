require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- MONGODB CONNECTION ---
let isConnected = false;
const connectDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        isConnected = true;
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
    }
};

// --- MONGODB SCHEMA ---
const orderSchema = new mongoose.Schema({
    customerName: String,
    mobile: String,
    email: String,
    serviceType: String,
    frontImage: String,
    backImage: String,
    quantity: Number,
    price: Number,
    instructions: String,
    status: { type: String, default: 'Pending' }, // Pending, Printing, Quality Check, Ready for Pickup, Dispatched
    paymentState: { type: String, default: 'Pending' },
    trackingId: String,
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// --- API ROUTES ---
app.post('/api/orders', async (req, res) => {
    await connectDB();
    try {
        const { customerName, mobile, email, serviceType, frontImage, backImage, quantity, instructions } = req.body;
        
        let unitPrice = 100;
        if(serviceType === 'Custom ID Card') unitPrice = 150;
        if(serviceType === 'Smart/RFID Card') unitPrice = 200;
        
        const price = unitPrice * (quantity || 1);
        const trackingId = 'PVC-' + Math.random().toString(36).substr(2, 6).toUpperCase();

        const newOrder = new Order({
            customerName, mobile, email, serviceType, frontImage, backImage, 
            quantity: quantity || 1, price, instructions, trackingId
        });

        await newOrder.save();
        res.json({ success: true, trackingId, message: "Order placed successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/track/:id', async (req, res) => {
    await connectDB();
    try {
        const order = await Order.findOne({ trackingId: req.params.id });
        if (!order) return res.json({ success: false, message: "Order not found" });
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- FRONTEND UI (CLAYMORPHISM) ---
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PVC PREMIUM PRINT | ID & Smart Cards</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;800&display=swap" rel="stylesheet">
        <style>
            :root {
                --bg: #e0e5ec;
                --shadow-light: #ffffff;
                --shadow-dark: #a3b1c6;
                --electric-blue: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%);
                --lavender: linear-gradient(135deg, #E0C3FC 0%, #8EC5FC 100%);
                --coral: linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%);
                --mint: linear-gradient(135deg, #84FAB0 0%, #8FD3F4 100%);
            }
            body { margin: 0; padding: 0; background: var(--bg); font-family: 'Poppins', sans-serif; color: #333; overflow-x: hidden; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            
            /* Claymorphism Base Classes */
            .clay-card {
                background: var(--bg); border-radius: 32px;
                box-shadow: 12px 12px 24px var(--shadow-dark), -12px -12px 24px var(--shadow-light);
                padding: 40px; margin-bottom: 40px; position: relative;
            }
            .clay-input {
                background: var(--bg); border-radius: 24px; border: none; width: 100%; box-sizing: border-box;
                box-shadow: inset 6px 6px 12px var(--shadow-dark), inset -6px -6px 12px var(--shadow-light);
                padding: 16px 24px; outline: none; font-family: 'Poppins', sans-serif; font-size: 16px; margin-bottom: 20px;
                transition: all 0.3s ease;
            }
            .clay-input:focus { box-shadow: inset 8px 8px 16px var(--shadow-dark), inset -8px -8px 16px var(--shadow-light); }
            .clay-btn {
                background: var(--lavender); border-radius: 24px; border: none; width: 100%;
                box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light), inset 2px 2px 5px rgba(255,255,255,0.5);
                color: #222; font-weight: 800; font-size: 18px; padding: 16px 32px; cursor: pointer; transition: all 0.2s ease-in-out;
            }
            .clay-btn:hover {
                transform: translateY(2px);
                box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light), inset 2px 2px 5px rgba(255,255,255,0.5);
            }
            
            /* Header */
            header { padding: 30px 20px; text-align: center; }
            .business-name { font-size: 3em; font-weight: 800; background: var(--electric-blue); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }
            .proprietor { font-weight: 600; color: #555; margin-top: 5px; }
            .contact-info { display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; margin-top: 15px; font-size: 0.9em; }
            .contact-badge { background: var(--bg); padding: 8px 16px; border-radius: 20px; box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light); display:flex; align-items:center; gap:8px;}

            /* Hero 3D Card */
            .hero-section { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; margin-bottom: 60px; }
            .hero-text { flex: 1; min-width: 300px; padding-right: 40px; }
            .hero-card-container { perspective: 1000px; flex: 1; min-width: 300px; display: flex; justify-content: center; }
            .hero-pvc-card {
                width: 350px; height: 220px; border-radius: 24px; background: var(--mint);
                box-shadow: 15px 15px 30px var(--shadow-dark), -15px -15px 30px var(--shadow-light), inset 2px 2px 10px rgba(255,255,255,0.5);
                transform-style: preserve-3d; transition: transform 0.1s; position: relative; padding: 20px; box-sizing: border-box;
            }
            .hero-pvc-card::before {
                content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 24px;
                background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%); pointer-events: none;
            }
            .card-chip { width: 50px; height: 40px; background: #ffd700; border-radius: 8px; box-shadow: inset 1px 1px 3px rgba(0,0,0,0.3); margin-top: 30px; }

            /* Badges */
            .features { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; margin-bottom: 50px; }
            .feature-badge {
                background: var(--bg); border-radius: 24px; padding: 15px 30px; font-weight: 600;
                box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light); color: #444;
                animation: float 3s ease-in-out infinite;
            }
            @keyframes float { 0% { transform: translateY(0); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0); } }

            /* Layout */
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
            @media(max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } }
            .price-display { font-size: 2em; font-weight: 800; color: #0072ff; text-align: center; margin: 20px 0; }
            .image-preview { width: 100%; height: 150px; border-radius: 20px; object-fit: cover; background: #d1d9e6; box-shadow: inset 4px 4px 8px var(--shadow-dark); margin-bottom: 20px;}
        </style>
    </head>
    <body>

    <header>
        <div class="container">
            <h1 class="business-name">PVC PREMIUM PRINT</h1>
            <div class="proprietor">Proprietor: MD SAYEM HOSSAIN</div>
            <div class="contact-info">
                <div class="contact-badge">📞 +91 9091569400</div>
                <div class="contact-badge">✉️ SAYEMKHAN4525@GMAIL.COM</div>
                <div class="contact-badge">📍 ENAYETPUR MOMINPARA, MANIKCHAK, MALDA, WB - 732202</div>
            </div>
        </div>
    </header>

    <div class="container">
        
        <div class="hero-section">
            <div class="hero-text">
                <h2 style="font-size: 2.5em; margin-bottom:10px;">Premium Heavy Duty PVC Identity Cards</h2>
                <p>Get High-Gloss & Matte Finish 300 GSM PVC Base cards instantly. 100% Waterproof, Scratch-Resistant & Long-Lasting HD Print Quality.</p>
            </div>
            <div class="hero-card-container" id="card-container">
                <div class="hero-pvc-card" id="tilt-card">
                    <h3 style="margin:0; color:#111;">Govt. / Smart ID</h3>
                    <div class="card-chip"></div>
                    <div style="margin-top: 50px; font-family: monospace; font-size: 1.2em; color: #222;">0000 1234 5678 9012</div>
                    <div style="margin-top: 10px; font-weight: 600; color: #111;">MD SAYEM HOSSAIN</div>
                </div>
            </div>
        </div>

        <div class="features">
            <div class="feature-badge" style="animation-delay: 0s;">💧 100% Waterproof</div>
            <div class="feature-badge" style="animation-delay: 0.5s;">🎨 HD Color Depth</div>
            <div class="feature-badge" style="animation-delay: 1s;">⚡ Express Print</div>
            <div class="feature-badge" style="animation-delay: 1.5s;">🛡️ Scratch Resistant</div>
        </div>

        <div class="grid-2">
            <!-- Order Form -->
            <div class="clay-card">
                <h2>📝 Print Order Form</h2>
                <form id="orderForm">
                    <input type="text" id="cName" class="clay-input" placeholder="Full Name" required>
                    <input type="text" id="cMobile" class="clay-input" placeholder="Mobile Number (e.g. 9091569400)" required>
                    <input type="email" id="cEmail" class="clay-input" placeholder="Email Address">
                    
                    <select id="cService" class="clay-input" required onchange="calcPrice()">
                        <option value="Aadhaar PVC Print">Aadhaar PVC Print (₹100)</option>
                        <option value="PAN Card PVC Print">PAN Card PVC Print (₹100)</option>
                        <option value="Voter ID PVC Print">Voter ID PVC Print (₹100)</option>
                        <option value="Custom ID Card">Custom Identity Card (₹150)</option>
                        <option value="Smart/RFID Card">Smart/RFID Card (₹200)</option>
                    </select>

                    <input type="number" id="cQty" class="clay-input" placeholder="Quantity" value="1" min="1" oninput="calcPrice()" required>
                    
                    <input type="url" id="cFront" class="clay-input" placeholder="Front Image URL (Drive/Imgur)" oninput="updatePreview('cFront', 'frontPreview')" required>
                    <img id="frontPreview" class="image-preview" src="" style="display:none;">

                    <input type="url" id="cBack" class="clay-input" placeholder="Back Image URL (Optional)" oninput="updatePreview('cBack', 'backPreview')">
                    <img id="backPreview" class="image-preview" src="" style="display:none;">

                    <textarea id="cInst" class="clay-input" placeholder="Special Printing Instructions..." rows="3"></textarea>

                    <div class="price-display">Total: ₹<span id="totalPrice">100</span></div>
                    
                    <button type="submit" class="clay-btn">Place Order Securely</button>
                </form>
            </div>

            <!-- Order Tracking -->
            <div>
                <div class="clay-card">
                    <h2>🔍 Track Order Status</h2>
                    <input type="text" id="trackId" class="clay-input" placeholder="Enter Tracking ID (e.g. PVC-XXXXXX)">
                    <button onclick="trackOrder()" class="clay-btn" style="background: var(--coral)">Check Status</button>
                    <div id="trackResult" style="margin-top: 20px; display: none; padding: 20px; border-radius: 24px; box-shadow: inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light);"></div>
                </div>
                
                <div class="clay-card" style="background: var(--mint); text-align:center;">
                    <h3>Instant Service Center</h3>
                    <p>Walk-ins welcome at our Manikchak location! Bring your digital files or email them to <b>SAYEMKHAN4525@GMAIL.COM</b> for immediate processing.</p>
                </div>
            </div>
        </div>

    </div>

    <script>
        // 3D Card Hover Effect
        const cardContainer = document.getElementById('card-container');
        const tiltCard = document.getElementById('tilt-card');
        cardContainer.addEventListener('mousemove', (e) => {
            const rect = cardContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -15;
            const rotateY = ((x - centerX) / centerX) * 15;
            tiltCard.style.transform = \`rotateX(\${rotateX}deg) rotateY(\${rotateY}deg)\`;
        });
        cardContainer.addEventListener('mouseleave', () => {
            tiltCard.style.transform = \`rotateX(0deg) rotateY(0deg)\`;
        });

        // Price Calculator
        function calcPrice() {
            const service = document.getElementById('cService').value;
            const qty = document.getElementById('cQty').value || 1;
            let price = 100;
            if(service === 'Custom ID Card') price = 150;
            if(service === 'Smart/RFID Card') price = 200;
            document.getElementById('totalPrice').innerText = price * qty;
        }

        // Image Preview
        function updatePreview(inputId, imgId) {
            const url = document.getElementById(inputId).value;
            const img = document.getElementById(imgId);
            if(url) {
                img.src = url;
                img.style.display = 'block';
            } else {
                img.style.display = 'none';
            }
        }

        // Handle Order Submission
        document.getElementById('orderForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                customerName: document.getElementById('cName').value,
                mobile: document.getElementById('cMobile').value,
                email: document.getElementById('cEmail').value,
                serviceType: document.getElementById('cService').value,
                quantity: document.getElementById('cQty').value,
                frontImage: document.getElementById('cFront').value,
                backImage: document.getElementById('cBack').value,
                instructions: document.getElementById('cInst').value
            };

            try {
                const res = await fetch('/api/orders', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if(data.success) {
                    alert('Order Placed Successfully! Your Tracking ID: ' + data.trackingId);
                    document.getElementById('orderForm').reset();
                    calcPrice();
                    document.getElementById('frontPreview').style.display = 'none';
                    document.getElementById('backPreview').style.display = 'none';
                } else { alert('Error: ' + data.error); }
            } catch (err) { alert('Request failed.'); }
        });

        // Handle Tracking
        async function trackOrder() {
            const id = document.getElementById('trackId').value;
            if(!id) return alert('Enter a Tracking ID');
            const res = await fetch('/api/track/' + id);
            const data = await res.json();
            const box = document.getElementById('trackResult');
            box.style.display = 'block';
            if(data.success) {
                box.innerHTML = \`
                    <b>Order ID:</b> \${data.order.trackingId}<br>
                    <b>Customer:</b> \${data.order.customerName}<br>
                    <b>Service:</b> \${data.order.serviceType}<br>
                    <b style="color:#0072ff; font-size:1.2em; display:block; margin-top:10px;">Status: \${data.order.status}</b>
                    <b style="color:#27ae60;">Payment: \${data.order.paymentState} (₹\${data.order.price})</b>
                \`;
            } else {
                box.innerHTML = \`<b style="color:red;">\${data.message}</b>\`;
            }
        }
    </script>
    </body>
    </html>
    `);
});

// Vercel Serverless Export
module.exports = app;

if(process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Client Server running on port ${PORT}`));
}
