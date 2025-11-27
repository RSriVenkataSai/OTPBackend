const pool = require('../db');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// ⭐ BREVO SMTP TRANSPORTER
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // smtp-relay.brevo.com
  port: process.env.EMAIL_PORT, // 587
  secure: false,
  auth: {
    user: process.env.EMAIL_USER, // 9ca7a2001@smtp-brevo.com
    pass: process.env.EMAIL_PASS, // your key
  },
});

// ---------------- REGISTER OTP ----------------

exports.sendRegisterOTP = async (req, res) => {
  const { name } = req.body;
  const email = req.body.email.toLowerCase();

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = Date.now() + 5 * 60 * 1000;

  try {
    const exists = await pool.query('SELECT * FROM users WHERE email=$1', [
      email,
    ]);
    if (exists.rows.length > 0)
      return res.json({ message: 'User already exists' });

    await pool.query(
      `INSERT INTO pending_users (name, email, otp, otp_expiry)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email)
       DO UPDATE SET name=$1, otp=$3, otp_expiry=$4`,
      [name, email, otp, otpExpiry],
    );

    // ⭐ SEND EMAIL USING BREVO
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Verify Your Email',
      text: `Your OTP for registration is: ${otp}`,
    });

    res.json({ message: 'OTP sent to email' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------- VERIFY REGISTER OTP ----------------

exports.verifyRegisterOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const record = await pool.query(
      'SELECT * FROM pending_users WHERE email=$1',
      [email],
    );
    if (record.rows.length === 0)
      return res
        .status(400)
        .json({ message: 'User not found in pending list' });

    const data = record.rows[0];

    if (data.otp !== otp)
      return res.status(400).json({ message: 'Invalid OTP' });

    if (Date.now() > data.otp_expiry)
      return res.status(400).json({ message: 'OTP expired' });

    await pool.query('INSERT INTO users (name, email) VALUES ($1, $2)', [
      data.name,
      data.email,
    ]);

    await pool.query('DELETE FROM pending_users WHERE email=$1', [email]);

    res.json({ message: 'Registration completed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------- LOGIN SEND OTP ----------------

exports.loginSendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await pool.query('SELECT * FROM users WHERE email=$1', [
      email,
    ]);

    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'User not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 5 * 60 * 1000;

    await pool.query('UPDATE users SET otp=$1, otp_expiry=$2 WHERE email=$3', [
      otp,
      otpExpiry,
      email,
    ]);

    // ⭐ SEND LOGIN OTP USING BREVO
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your Login OTP',
      text: `Your OTP is: ${otp} (valid for 5 minutes)`,
    });

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ error: err.message });
  }
};

// ---------------- LOGIN VERIFY OTP ----------------

exports.loginVerifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await pool.query('SELECT * FROM users WHERE email=$1', [
      email,
    ]);

    if (user.rows.length === 0)
      return res.status(400).json({ message: 'User not found' });

    const data = user.rows[0];

    if (data.otp !== otp)
      return res.status(400).json({ message: 'Invalid OTP' });

    if (Date.now() > data.otp_expiry)
      return res.status(400).json({ message: 'OTP expired' });

    const token = jwt.sign(
      { id: data.id, email: data.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' },
    );

    await pool.query(
      'UPDATE users SET otp=NULL, otp_expiry=NULL WHERE email=$1',
      [email],
    );

    res.json({ message: 'Login successful', token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
