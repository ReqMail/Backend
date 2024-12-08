const Imap = require('imap');
const { simpleParser } = require('mailparser');
const {
  EthereumPrivateKeySignatureProvider,
} = require("@requestnetwork/epk-signature");
const { Types, RequestNetwork,Utils } = require("@requestnetwork/request-client.js");
// const { Utils } = require("@requestnetwork/utils");
// const { Wallet } = require("ethers");
const { ethers,Wallet } = require('ethers');
const dotenv = require('dotenv');
const { hasSufficientFunds, hasErc20Approval, approveErc20, payRequest } = require("@requestnetwork/payment-processor");
const { generateInvoice, sendInvoiceEmail } = require('./invoiceGenerator');
dotenv.config();

// Email credentials
const emailConfig = {
  user: 'reqmail12@gmail.com',
  password: 'ulpw begr nyxq suse',
  host: 'imap.gmail.com', // Replace with your email provider's IMAP server
  port: 993,
  tls: true,
  tlsOptions: {
    rejectUnauthorized: false, // Disable certificate validation
  },
};

// Initialize IMAP connection
const imap = new Imap(emailConfig);
// console.log(process.env.PAYEE_PRIVATE_KEY);
// Request Network configuration
const requestClient = new RequestNetwork({
  nodeConnectionConfig: {
    baseURL: "https://sepolia.gateway.request.network/",
  },
  signatureProvider: new EthereumPrivateKeySignatureProvider({
    method: Types.Signature.METHOD.ECDSA,
    privateKey: process.env.PAYER_PRIVATE_KEY, // Must include 0x prefix
  }),
  currencies: [{
    network: "sepolia",
    address: process.env.TOKEN_ADDRESS,
    decimals: 18,
    symbol: "TEST",
    type: Types.RequestLogic.CURRENCY.ERC20
}]
});

async function getRequestData(requestId) {
  try {
      const request = await requestClient.fromRequestId(requestId);
      const requestData = await request.getData();
      console.log("requestData",requestData);
      return {
          requestId: requestId,
          payer: requestData.payer.value,
          payee: requestData.payee.value,
          amount: requestData.expectedAmount/10**18,
          currency: "RTK",
          reason: requestData.contentData.reason || 'Transfer',
          timestamp: requestData.timestamp
      };
  } catch (error) {
      console.error('Error fetching request data:', error);
      throw error;
  }
}

// Add this function to fetch addresses from the server
async function getAddressFromEmail(emailAddress) {
  try {
    console.log("encodedemail",encodeURIComponent(emailAddress));
    const response = await fetch(
      `http://localhost:5500/address?email=${encodeURIComponent(emailAddress)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();
    console.log("data",data.data.accountAddress);
    if (!data.success) {
      throw new Error(`No address found for email: ${emailAddress}`);
    }

    return data.data.accountAddress;
  } catch (error) {
    console.error('Error fetching address:', error);
    throw error;
  }
}

// Update createAndPayRequest to use the fetched addresses
async function createAndPayRequest(fromEmail, toEmail, amount) {
  try {
    // Get addresses from server
    const payerAddress = await getAddressFromEmail(fromEmail);
    const payeeAddress = await getAddressFromEmail(toEmail);
    const provider = new ethers.providers.JsonRpcProvider(process.env.JSON_RPC_PROVIDER_URL);
    const payerSigner = new Wallet(
      process.env.PAYER_PRIVATE_KEY,
      provider
    )
    // Create request parameters
    const requestCreateParameters = {
      requestInfo: {
        currency: {
          type: Types.RequestLogic.CURRENCY.ERC20,
          value: process.env.TOKEN_ADDRESS,
          network: "sepolia",
        },
        expectedAmount: amount,
        payee: {
          type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
          value: payeeAddress,
        },
        payer: {
          type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
          value: payerAddress,
        },
        timestamp: Utils.getCurrentTimestampInSecond(),
      },
      paymentNetwork: {
        id: Types.Extension.PAYMENT_NETWORK_ID.ERC20_FEE_PROXY_CONTRACT,
        parameters: {
          paymentNetworkName: "sepolia",
          paymentAddress: payeeAddress,
          feeAddress: "0x0000000000000000000000000000000000000000",
          feeAmount: "0",
        },
      },
      contentData: {
        reason: `Transfer from ${fromEmail} to ${toEmail}`,
        createdDate: new Date().toISOString(),
      },
      signer: {
        type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
        value: payeeAddress,
      },
    };

    // Create the request
    console.log("Creating request...");
    const request = await requestClient.createRequest(requestCreateParameters);
    const requestData = await request.waitForConfirmation();
    console.log(`Request created with ID: ${requestData.requestId}`);

    // Check funds
    console.log("Checking sufficient funds...");
    const hasFunds = await hasSufficientFunds({
      request: requestData,
      address: payerAddress,
      providerOptions: { provider },
    });
    if (!hasFunds) {
      throw new Error("Insufficient funds for payment");
    }

    // Check and provide ERC20 approval if needed
    console.log("Checking ERC20 approval...");
    const hasApproval = await hasErc20Approval(
      requestData,
      payerAddress,
      provider
    );
    if (!hasApproval) {
      console.log("Requesting ERC20 approval...");
      const approvalTx = await approveErc20(requestData, payerSigner); 
      await approvalTx.wait(2);
      console.log("ERC20 approval granted");
    }

    // Pay the request
    console.log("Processing payment...");
    const paymentTx = await payRequest(requestData, payerSigner);
    await paymentTx.wait(2);
    console.log(`Payment completed. Transaction hash: ${paymentTx.hash}`);

    return {
      success: true,
      requestId: requestData.requestId,
      paymentTx: paymentTx.hash,
    };
  } catch (error) {
    console.error("Error in createAndPayRequest:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Update performOperation function
async function performOperation(subject, body, fromEmail) {
  if (/transfer/i.test(subject) || /transfer/i.test(body)) {
    console.log("Performing transfer operation...");
    
    // Extract amount and recipient email from the email body
    const amount = extractAmountFromEmail(body);
    const toEmail = extractToEmailFromBody(body); // You'll need to implement this
    
    const result = await createAndPayRequest(fromEmail, toEmail, amount);
    if (result.success) {
      console.log(`Transfer completed successfully. Request ID: ${result.requestId}`);
      const requestData = await getRequestData(result.requestId);
      const invoiceFile = await generateInvoice(requestData);
      
      // Send invoice to payee
      await sendInvoiceEmail(
        fromEmail, 
        invoiceFile,
        requestData
      );
  
      console.log('Invoice generated and sent successfully');
    } else {
      console.error(`Transfer failed: ${result.error}`);
    }
  } else if (/swap/i.test(subject) || /swap/i.test(body)) {
    console.log("Performing swap operation...");
    // Add swap operation logic here
  } else {
    console.log("No matching operation found for this email.");
  }
}

// Add helper function to extract recipient email
function extractToEmailFromBody(body) {
  // This is a placeholder - implement based on your email format
  // Example: look for patterns like "to: user@example.com" or "recipient: user@example.com"
  const emailMatch = body.match(/to:\s*([^\s]+@[^\s]+)/i);
  if (emailMatch) {
    return emailMatch[1];
  }
  throw new Error("Could not extract recipient email from body");
}

// Helper function to extract amount from email (implement based on your email format)
function extractAmountFromEmail(body) {
  // This is a placeholder - implement based on your email format
  // Example: look for patterns like "amount: 1.5" or "transfer 1.5 tokens"
  const amountMatch = body.match(/amount:\s*(\d+\.?\d*)/i);
  if (amountMatch) {
    // Convert to wei or the appropriate token decimal format
    return ethers.utils.parseUnits(amountMatch[1], 18).toString(); // Adjust decimals as needed
  }
  throw new Error("Could not extract amount from email");
}

async function delayedResolve() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("Resolved!");
    }, 2000);
  });
}
// Update processEmail function
async function processEmail(email) {
  try {
    console.log("Processing email from:", email.from.value[0].address);
    // console.log("email",email.subject,email.text);
    await performOperation(email.subject, email.text, email.from.value[0].address);

    // After transaction is complete, get request data and generate invoice
   
  } catch (error) {
    console.error('Error processing email:', error);
    throw error;
  }
}

// async function processEmail(email) {
//   try {
//       // Extract email details
//       const fromAddress = email.from.value[0].address;
//       console.log('Processing email from:', fromAddress);

//       // Process the email content
//       const text = email.text;
//       if (text.toLowerCase().includes('transfer')) {
//           console.log('Performing transfer operation...');
          
//           // Extract transfer details from email
//           const amountMatch = text.match(/amount:\s*(\d+(\.\d+)?)/i);
//           const toMatch = text.match(/to:\s*([^\s]+@[^\s]+)/i);
          
//           if (!amountMatch || !toMatch) {
//               throw new Error('Invalid transfer format');
//           }

//           const amount = amountMatch[1];
//           const toEmail = toMatch[1];

//           // Get addresses for both parties
//           const fromAccountAddress = await getAddressFromEmail(fromAddress);
//           const toAccountAddress = await getAddressFromEmail(toEmail);

//           // Create and process the request
//           console.log('Creating request...');
//           const request = await createRequest(
//               fromAccountAddress,
//               toAccountAddress,
//               amount
//           );
          
//           // Store the requestId from the created request
//           const requestId = request.requestId;
//           console.log(`Request created with ID: ${requestId}`);

//           // Process the payment
//           await processPayment(request);
//           console.log(`Transfer completed successfully. Request ID: ${requestId}`);

//           // After transaction is complete, get request data and generate invoice
//           const requestData = await getRequestData(requestId);
//           const invoiceFile = await generateInvoice(requestData);
          
//           // Send invoice to payee
//           await sendInvoiceEmail(
//               toEmail,  // Send to recipient's email
//               invoiceFile,
//               requestData
//           );

//           console.log('Invoice generated and sent successfully');
//       }
//   } catch (error) {
//       console.error('Error processing email:', error);
//       throw error;
//   }
// }

// Modify the fetchEmails function to return a promise
function fetchEmails() {
  return new Promise((resolve, reject) => {
    imap.openBox('INBOX', true, (err, box) => {
      if (err) {
        console.error('Error opening inbox:', err);
        reject(err);
        return;
      }

      imap.search(['UNSEEN'], (err, results) => {
        if (err) {
          console.error('Error searching emails:', err);
          reject(err);
          return;
        }

        if (!results || results.length === 0) {
          console.log('No new emails found.');
          resolve();
          return;
        }

        const fetch = imap.fetch(results, { bodies: '' });
        const promises = [];

        fetch.on('message', (msg) => {
          const promise = new Promise((resolveMsg) => {
            msg.on('body', (stream) => {
              simpleParser(stream, async (err, parsed) => {
                if (err) {
                  console.error('Error parsing email:', err);
                  resolveMsg();
                  return;
                }
                try {
                  await processEmail(parsed);
                  resolveMsg();
                } catch (error) {
                  console.error('Error processing email:', error);
                  resolveMsg();
                }
              });
            });
          });
          promises.push(promise);
        });

        fetch.once('error', (err) => {
          console.error('Fetch error:', err);
          reject(err);
        });

        fetch.once('end', async () => {
          await Promise.all(promises);
          console.log('Done fetching emails.');
          resolve();
        });
      });
    });
  });
}

// Create a function to handle the IMAP connection cycle
async function startEmailMonitoring() {
  try {
    // Initial connection
    await new Promise((resolve, reject) => {
      imap.once('ready', resolve);
      imap.once('error', reject);
      imap.connect();
    });

    // First email fetch
    await fetchEmails();
    
    // Close the initial connection
    imap.end();

    // Set up periodic monitoring
    console.log('Setting up periodic email monitoring...');
    
    // Check emails every minute
    setInterval(async () => {
      try {
        // Create new connection
        await new Promise((resolve, reject) => {
          imap.once('ready', resolve);
          imap.once('error', reject);
          imap.connect();
        });

        // Fetch emails
        await fetchEmails();
        
        // Close connection
        imap.end();
      } catch (error) {
        console.error('Error in email monitoring cycle:', error);
        // Ensure connection is closed on error
        try {
          imap.end();
        } catch (e) {
          // Ignore end errors
        }
      }
    }, 60000); // Check every minute

  } catch (error) {
    console.error('Error starting email monitoring:', error);
    process.exit(1);
  }
}

// Error handling for IMAP connection
imap.once('error', (err) => {
  console.error('IMAP error:', err);
});

imap.once('end', () => {
  console.log('IMAP connection ended');
});

// Start the monitoring
console.log('Starting email monitoring service...');
startEmailMonitoring().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down...');
  try {
    imap.end();
  } catch (e) {
    // Ignore end errors
  }
  process.exit(0);
});
// Export for testing
module.exports = { processEmail };
