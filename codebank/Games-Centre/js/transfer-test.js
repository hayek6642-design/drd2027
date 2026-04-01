// Example transfer test script
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize transfer manager
        const manager = new TransferManager();
        await manager.initialize();
        console.log('TransferManager initialized');

        // Test sending a transfer
        document.getElementById('send-button').addEventListener('click', async () => {
            // Get form values
            const receiverEmail = document.getElementById('receiver-email').value;
            const amount = parseInt(document.getElementById('transfer-amount').value);
            const assetType = document.getElementById('asset-type').value;

            if (!receiverEmail || !amount) {
                alert('Please fill in all fields');
                return;
            }

            // Call the transfer manager's handleSend
            await manager.handleSend();
        });

        // Set up a test transfer to monitor acceptance
        const testTransfer = {
            id: 'test-123',
            sender_email: 'sender@test.com',
            receiver_email: 'receiver@test.com',
            amount: 100,
            asset_type: 'codes',
            status: 'pending'
        };

        // Create a notification for the test transfer
        manager.createToastNotification(testTransfer);

        console.log('Transfer test setup complete');
    } catch (error) {
        console.error('Transfer test setup failed:', error);
    }
});
