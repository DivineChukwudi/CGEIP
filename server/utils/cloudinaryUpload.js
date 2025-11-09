// server/utils/cloudinaryUpload.js - FIXED VERSION
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configure Cloudinary with detailed logging
console.log('\n╔═══════════════════════════════════════════╗');
console.log('║   CLOUDINARY CONFIGURATION CHECK        ║');
console.log('╚═══════════════════════════════════════════╝');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');

// Validate that all required Cloudinary credentials are present
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('\n❌ CRITICAL: Cloudinary credentials are missing!');
  console.error('   Please add the following to your .env file:');
  console.error('   CLOUDINARY_CLOUD_NAME=your_cloud_name');
  console.error('   CLOUDINARY_API_KEY=your_api_key');
  console.error('   CLOUDINARY_API_SECRET=your_api_secret');
  console.error('');
  console.error('   Get your credentials from: https://console.cloudinary.com/\n');
} else {
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  
  console.log('✅ Cloudinary configured successfully\n');
}

// Test Cloudinary connection
async function testCloudinaryConnection() {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection test: SUCCESS');
    return true;
  } catch (error) {
    console.error('❌ Cloudinary connection test: FAILED');
    console.error('   Error:', error.message);
    return false;
  }
}

// Upload file to Cloudinary
async function uploadToCloudinary(file, userId, folder = 'transcripts') {
  try {
    // Validate Cloudinary configuration before attempting upload
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary is not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file');
    }

    console.log(`\n📤 Uploading file to Cloudinary...`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Folder: ${folder}`);
    console.log(`   File size: ${(file.buffer.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   MIME type: ${file.mimetype}`);

    return new Promise((resolve, reject) => {
      // Create readable stream from buffer
      const stream = Readable.from([file.buffer]);

      // Upload to Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `cgeip/${folder}/${userId}`,
          resource_type: 'auto',
          type: 'upload', // Changed from 'authenticated' to 'upload' for easier access
          flags: 'attachment', // Force download instead of display
          timeout: 120000,
          overwrite: false,
          unique_filename: true
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error.message);
            console.error('   Error code:', error.http_code);
            
            // Provide specific error messages
            if (error.message.includes('api_key')) {
              reject(new Error('Cloudinary API key is missing or invalid. Please check your .env file'));
            } else if (error.message.includes('api_secret')) {
              reject(new Error('Cloudinary API secret is missing or invalid. Please check your .env file'));
            } else if (error.message.includes('cloud_name')) {
              reject(new Error('Cloudinary cloud name is missing or invalid. Please check your .env file'));
            } else {
              reject(new Error(`Cloudinary upload error: ${error.message}`));
            }
          } else {
            console.log('✅ File uploaded successfully to Cloudinary');
            console.log('   URL:', result.secure_url);
            console.log('   Public ID:', result.public_id);
            console.log('   Format:', result.format);
            console.log('   Size:', (result.bytes / 1024 / 1024).toFixed(2), 'MB\n');
            
            resolve(result.secure_url);
          }
        }
      );

      // Handle stream errors
      stream.on('error', (error) => {
        console.error('❌ Stream error:', error.message);
        reject(new Error(`Stream error: ${error.message}`));
      });

      stream.pipe(uploadStream);
    });
  } catch (error) {
    console.error('❌ Upload preparation error:', error.message);
    throw new Error('File upload failed: ' + error.message);
  }
}

// Delete file from Cloudinary
async function deleteFromCloudinary(publicId) {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary is not configured');
    }

    console.log(`🗑️  Deleting file from Cloudinary: ${publicId}`);
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      console.log('✅ File deleted successfully from Cloudinary\n');
      return true;
    } else {
      console.warn('⚠️  File deletion result:', result.result);
      return false;
    }
  } catch (error) {
    console.error('❌ Cloudinary deletion error:', error.message);
    throw new Error('File deletion failed: ' + error.message);
  }
}

// Get file URL from Cloudinary
function getCloudinaryUrl(publicId, options = {}) {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new Error('Cloudinary cloud name is not configured');
    }

    return cloudinary.url(publicId, {
      secure: true,
      ...options
    });
  } catch (error) {
    console.error('❌ Error generating Cloudinary URL:', error.message);
    throw new Error('URL generation failed: ' + error.message);
  }
}

module.exports = { 
  uploadToCloudinary,
  deleteFromCloudinary,
  getCloudinaryUrl,
  testCloudinaryConnection
};