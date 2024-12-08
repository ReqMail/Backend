const { processEmail } = require('../utils/mailReader.cjs');

async function testTransferEmail() {
    // Simulate an email object
    const testEmail = {
        subject: 'Transfer Request',
        text: 'transfer amount: 15 to: recipient@example.com',
        from: {
            value: [{
                address: 'sender@example.com'
            }]
        }
    };

    try {
        await processEmail(testEmail);
        console.log('Test completed successfully');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testTransferEmail(); 