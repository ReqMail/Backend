const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Store addresses (in a real app, this would be a database)
let addresses = [
    {
        emailAddress: "sakshambhugra8@gmail.com",
        accountAddress: "0x1526d2B6d07C6661D71Be58d92A4F088d36C8FfD"
    },
    {
        emailAddress: "fitnessfrreak2@gmail.com",
        accountAddress: "0x3076b4C231d953631B41166ACF72dD9f7EbAb1A0"
    }
];

// GET endpoint to retrieve all addresses
app.get('/addresses', (req, res) => {
    try {
        res.status(200).json({ 
            success: true, 
            data: addresses 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// NEW: GET endpoint to retrieve account address by email
app.get('/address', (req, res) => {
    try {
        const { email } = req.query;
        const emailAddress = email;
        if (!emailAddress) {
            return res.status(400).json({
                success: false,
                error: 'Please provide an emailAddress in the request body'
            });
        }

        const address = addresses.find(addr => addr.emailAddress === emailAddress);

        if (!address) {
            return res.status(404).json({
                success: false,
                error: 'No account found for this email address'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                accountAddress: address.accountAddress,
                emailAddress: address.emailAddress
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST endpoint to add new address
app.post('/address', (req, res) => {
    try {
        const { accountAddress, emailAddress } = req.body;
        
        // Validate input
        if (!accountAddress || !emailAddress) {
            return res.status(400).json({
                success: false,
                error: 'Please provide both accountAddress and emailAddress'
            });
        }

        // Check if email already exists
        const existingAddress = addresses.find(addr => addr.emailAddress === emailAddress);
        if (existingAddress) {
            return res.status(400).json({
                success: false,
                error: 'Email address already registered'
            });
        }

        // Add new address
        const newAddress = {
            accountAddress,
            emailAddress,
            timestamp: new Date().toISOString()
        };

        addresses.push(newAddress);

        res.status(201).json({
            success: true,
            data: newAddress
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});