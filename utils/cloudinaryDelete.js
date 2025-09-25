const axios = require("axios");
const crypto = require("crypto");

async function deleteFromCloudinary(publicId) {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHash("sha1")
      .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
      .digest("hex");

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      new URLSearchParams({
        public_id: publicId,
        api_key: apiKey,
        timestamp,
        signature,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    return response.data;
  } catch (err) {
    console.error("❌ Cloudinary delete error:", err.message);
    throw err;
  }
}

module.exports = { deleteFromCloudinary };
