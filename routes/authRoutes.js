const express = require('express');
const router = express.Router();
const {
  sendRegisterOTP,
  verifyRegisterOTP,
  loginSendOTP,
  loginVerifyOTP,
} = require('../controllers/authController');

router.post('/send-register-otp', sendRegisterOTP);
router.post('/verify-register-otp', verifyRegisterOTP);
router.post('/login-send-otp', loginSendOTP);
router.post('/login-verify-otp', loginVerifyOTP);

module.exports = router;
