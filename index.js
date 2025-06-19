require('dotenv').config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const midtransClient = require("midtrans-client");

const app = express();
const PORT = process.env.PORT || 3000;

// Cek environment variable Midtrans
if (!process.env.MIDTRANS_SERVER_KEY) {
  throw new Error("❌ MIDTRANS_SERVER_KEY tidak ditemukan di environment variable!");
}
if (!process.env.MIDTRANS_CLIENT_KEY) {
  throw new Error("❌ MIDTRANS_CLIENT_KEY tidak ditemukan di environment variable!");
}

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Setup Midtrans Snap
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// Endpoint untuk membuat transaksi
app.post("/createTransaction", async (req, res) => {
  const { orderId, amount, name, email } = req.body;

  try {
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      customer_details: {
        first_name: name,
        email: email
      },
      
    };

    const transaction = await snap.createTransaction(parameter);

    // Log transaksi baru
    console.log(`✅ Transaksi dibuat untuk ${orderId}, total: ${amount}`);

    res.status(200).json({
      token: transaction.token,
      redirect_url: transaction.redirect_url
    });
  } catch (error) {
    console.error("❌ Gagal membuat transaksi:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint notifikasi dari Midtrans
app.post("/notification", async (req, res) => {
  try {
    const notification = req.body;

    const coreApi = new midtransClient.CoreApi({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });

    const statusResponse = await coreApi.transaction.notification(notification);

    const {
      transaction_status,
      order_id,
      payment_type,
      fraud_status
    } = statusResponse;

    console.log(`🔔 Notifikasi diterima:`);
    console.log(`➡️ Order ID: ${order_id}`);
    console.log(`➡️ Status: ${transaction_status}`);
    console.log(`➡️ Payment Type: ${payment_type}`);
    console.log(`➡️ Fraud Status: ${fraud_status}`);

    // Simpan ke DB atau log sesuai kebutuhan
    if (transaction_status === 'settlement') {
      console.log(`✅ Pembayaran berhasil untuk order ${order_id}`);
    } else if (transaction_status === 'cancel') {
      console.log(`❌ Pembayaran dibatalkan untuk order ${order_id}`);
    } else if (transaction_status === 'pending') {
      console.log(`⏳ Pembayaran pending untuk order ${order_id}`);
    }

    res.status(200).json({ message: "Notifikasi berhasil diproses" });
  } catch (err) {
    console.error("❌ Gagal memproses notifikasi:", err);
    res.status(500).json({ error: err.message });
  }
});

// Root route
app.get("/", (req, res) => {
  res.send("✅ Midtrans backend is running!");
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
});