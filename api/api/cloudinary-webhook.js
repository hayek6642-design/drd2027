// Cloudinary Webhook Handler - Serverless Function
// Handles notifications from Cloudinary for upload events, moderation results, etc.

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify Cloudinary webhook signature for security
    const isValidSignature = await verifyCloudinarySignature(req);

    if (!isValidSignature) {
      console.warn('Invalid Cloudinary webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { notification_type, ...payload } = req.body;

    console.log(`Cloudinary webhook received: ${notification_type}`, payload);

    switch (notification_type) {
      case 'upload':
        await handleUploadNotification(payload);
        break;

      case 'moderation':
        await handleModerationNotification(payload);
        break;

      case 'delete':
        await handleDeleteNotification(payload);
        break;

      case 'transform':
        await handleTransformNotification(payload);
        break;

      default:
        console.log(`Unhandled notification type: ${notification_type}`);
    }

    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Cloudinary webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Verify Cloudinary webhook signature
async function verifyCloudinarySignature(req) {
  try {
    const crypto = await import('crypto');

    // Get the raw body and signature from headers
    const body = JSON.stringify(req.body);
    const signature = req.headers['x-cld-signature'];
    const timestamp = req.headers['x-cld-timestamp'];

    if (!signature || !timestamp) {
      return false;
    }

    // Cloudinary API secret (should be in environment variables)
    const apiSecret = process.env.CLOUDINARY_API_SECRET || 'zfSbK0-zK3tHdmCWdcCduPcxtU4';

    // Create the expected signature
    const expectedSignature = crypto.default
      .createHash('sha256')
      .update(body + timestamp + apiSecret)
      .digest('hex');

    // Compare signatures
    return crypto.default.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Handle upload notifications
async function handleUploadNotification(payload) {
  const {
    public_id,
    secure_url,
    bytes,
    format,
    width,
    height,
    duration,
    context,
    moderation,
    created_at
  } = payload;

  console.log(`Upload completed: ${public_id}`);

  try {
    // Store upload metadata in database or cache
    const uploadData = {
      public_id,
      secure_url,
      bytes,
      format,
      width,
      height,
      duration,
      context,
      moderation,
      created_at,
      processed_at: new Date().toISOString(),
      status: 'completed'
    };

    // Here you would typically:
    // 1. Store in database
    // 2. Update video index
    // 3. Trigger post-processing tasks
    // 4. Send notifications to users

    // For now, just log the successful upload
    console.log('Upload data stored:', uploadData);

    // If this is a Farragna video, update the video list
    if (public_id.includes('farragna/')) {
      await updateFarragnaVideoIndex(uploadData);
    }

  } catch (error) {
    console.error('Error handling upload notification:', error);
  }
}

// Handle moderation notifications
async function handleModerationNotification(payload) {
  const { public_id, moderation_status, moderation_kind, moderation_response } = payload;

  console.log(`Moderation result for ${public_id}: ${moderation_status}`);

  try {
    // Update moderation status in database
    const moderationData = {
      public_id,
      moderation_status,
      moderation_kind,
      moderation_response,
      moderated_at: new Date().toISOString()
    };

    // Handle different moderation outcomes
    switch (moderation_status) {
      case 'approved':
        await handleApprovedContent(moderationData);
        break;

      case 'rejected':
        await handleRejectedContent(moderationData);
        break;

      case 'manual':
        await handleManualReviewContent(moderationData);
        break;

      default:
        console.log(`Unknown moderation status: ${moderation_status}`);
    }

  } catch (error) {
    console.error('Error handling moderation notification:', error);
  }
}

// Handle delete notifications
async function handleDeleteNotification(payload) {
  const { public_id, resource_type, invalidated } = payload;

  console.log(`Resource deleted: ${public_id}`);

  try {
    // Remove from database and update indexes
    await removeFromVideoIndex(public_id);

    // Clean up related data
    if (public_id.includes('farragna/')) {
      await cleanupFarragnaData(public_id);
    }

  } catch (error) {
    console.error('Error handling delete notification:', error);
  }
}

// Handle transform notifications
async function handleTransformNotification(payload) {
  const { public_id, transformation, secure_url } = payload;

  console.log(`Transform completed for ${public_id}`);

  try {
    // Update transformation URLs in database
    await updateTransformationUrls(public_id, transformation, secure_url);

  } catch (error) {
    console.error('Error handling transform notification:', error);
  }
}

// Helper functions for handling different scenarios

async function updateFarragnaVideoIndex(uploadData) {
  // Update Farragna's video index
  // This would typically involve updating a database or cache
  console.log('Updating Farragna video index for:', uploadData.public_id);
}

async function handleApprovedContent(moderationData) {
  console.log('Content approved:', moderationData.public_id);
  // Make content publicly available
}

async function handleRejectedContent(moderationData) {
  console.log('Content rejected:', moderationData.public_id);
  // Remove content or mark as hidden
  // Send notification to uploader
}

async function handleManualReviewContent(moderationData) {
  console.log('Content requires manual review:', moderationData.public_id);
  // Flag for admin review
  // Send notification to admins
}

async function removeFromVideoIndex(publicId) {
  console.log('Removing from video index:', publicId);
  // Remove from database/cache
}

async function cleanupFarragnaData(publicId) {
  console.log('Cleaning up Farragna data for:', publicId);
  // Remove related metadata, comments, likes, etc.
}

async function updateTransformationUrls(publicId, transformation, secureUrl) {
  console.log('Updating transformation URLs for:', publicId);
  // Update cached transformation URLs
}

// Export for testing
export {
  verifyCloudinarySignature,
  handleUploadNotification,
  handleModerationNotification,
  handleDeleteNotification,
  handleTransformNotification
};