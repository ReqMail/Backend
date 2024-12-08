const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fs = require('fs');

async function generateInvoice(transactionData) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const fileName = `invoice_${transactionData.requestId}.pdf`;
        const writeStream = fs.createWriteStream(fileName);

        // Pipe PDF to writeStream
        doc.pipe(writeStream);

        // Add content to PDF
        doc.fontSize(20).text('Transaction Invoice', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Request ID: ${transactionData.requestId}`);
        doc.moveDown();
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        doc.moveDown();
        doc.text(`From: ${transactionData.payer}`);
        doc.text(`To: ${transactionData.payee}`);
        doc.moveDown();
        doc.text(`Amount: ${transactionData.amount} ${transactionData.currency}`);
        doc.moveDown();
        doc.text(`Reason: ${transactionData.reason}`);

        // Finalize PDF
        doc.end();

        writeStream.on('finish', () => {
            resolve(fileName);
        });

        writeStream.on('error', reject);
    });
}

async function sendInvoiceEmail(recipientEmail, invoiceFile, transactionData) {
    // Configure email transport
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    // Email options
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: 'Transaction Invoice',
        text: `Please find attached the invoice for transaction ${transactionData.requestId}`,
        attachments: [{
            filename: 'invoice.pdf',
            path: invoiceFile
        }]
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Clean up - delete the temporary PDF file
    fs.unlinkSync(invoiceFile);
}

module.exports = {
    generateInvoice,
    sendInvoiceEmail
}; 