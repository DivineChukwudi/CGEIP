// server/utils/cloudinaryUpload.js
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload file to Cloudinary
async function uploadToCloudinary(file, userId, folder = 'transcripts') {
  try {
    return new Promise((resolve, reject) => {
      // Create readable stream from buffer
      const stream = Readable.from([file.buffer]);

      // Upload to Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `limkokwing/${folder}/${userId}`,
          resource_type: 'auto',
          type: 'authenticated',
          flags: 'keep_iptc',
          timeout: 120000
        },
        (error, result) => {
          if (error) {
            reject(new Error(`Cloudinary upload error: ${error.message}`));
          } else {
            resolve(result.secure_url);
          }
        }
      );

      stream.pipe(uploadStream);
    });
  } catch (error) {
    throw new Error('File upload failed: ' + error.message);
  }
}

module.exports = { uploadToCloudinary };