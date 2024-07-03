// Example using Express.js
const express = require('express');
const app = express();
const indexRoutes = require("./routes/index");
const bodyParser = require('body-parser');
const env = require('dotenv').config(); // Load environment variables from .env file

app.use(express.json());
// app.use(bodyParser.urlencoded({ extended: true }));

// Example defining a route in Express
app.use('/', indexRoutes);

// Example specifying the port and starting the server
const port = process.env.PORT || 4000; // You can use environment variables for port configuration
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});