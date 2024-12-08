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
let addresses = [];

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
        console.log("fetching account address for emailAddress",emailAddress);
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
        console.log("adding account address for emailAddress",emailAddress);
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