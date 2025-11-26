const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);

app.listen(process.env.PORT || 5000, '0.0.0.0', () => {
  console.log('Server running on port ' + process.env.PORT);
});
