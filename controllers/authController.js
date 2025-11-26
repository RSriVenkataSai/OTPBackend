const pool = require('../db');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

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

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email',
      text: `Your OTP for registration is: ${otp}`,
    });

    res.json({ message: 'OTP sent to email' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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
// exports.loginSendOTP = async (req, res) => {
//   console.log('working');
//   const { email, otp } = req.body;

//   try {
//     console.log('Try Started');
//     const user = await pool.query('SELECT * FROM users WHERE email=$1', [
//       email,
//     ]);
//     console.log(user.fields);

//     if (user.rows.length === 0) {
//       console.log('Length is 0');
//       return res.status(400).json({ message: 'User not found' });
//     }

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     const otpExpiry = Date.now() + 5 * 60 * 1000;
//     console.log('Updating Otp');
//     await pool.query('UPDATE users SET otp=$1, otp_expiry=$2 WHERE email=$3', [
//       otp,
//       otpExpiry,
//       email,
//     ]);
//     console.log('Otp Updated');

//     console.log('Creating Mail');
//     const transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
//     });
//     console.log('Mail Created');

//     console.log('Sending Mail');
//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: 'Your Login OTP',
//       text: `Your OTP is: ${otp} (valid for 5 minutes)`,
//     });
//     console.log('Mail Sent');

//     res.json({ message: 'OTP sent successfully' });
//   } catch (err) {
//     console.log(err.message);
//     res.status(500).json({ error: err.message });
//   }
// };

exports.loginSendOTP = async (req, res) => {
  console.log('working');
  const { email } = req.body;

  try {
    console.log('Try Started');
    const user = await pool.query('SELECT * FROM users WHERE email=$1', [
      email,
    ]);
    console.log(user.fields);

    if (user.rows.length === 0) {
      console.log('Length is 0');
      return res.status(400).json({ message: 'User not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 5 * 60 * 1000;

    console.log('Updating Otp');
    await pool.query('UPDATE users SET otp=$1, otp_expiry=$2 WHERE email=$3', [
      otp,
      otpExpiry,
      email,
    ]);
    console.log('Otp Updated');

    console.log('Creating Mail');
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
    });
    console.log('Mail Created');

    console.log('Sending Mail');
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Login OTP',
      text: `Your OTP is: ${otp} (valid for 5 minutes)`,
    });

    console.log('Mail Sent');
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ error: err.message });
  }
};

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
