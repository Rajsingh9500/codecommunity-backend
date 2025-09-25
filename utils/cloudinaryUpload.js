const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

async function uploadToCloudinary(filePath, subfolder = "avatars") {
  try {
    const folder = `codecommunity-backend/uploads/${subfolder}`;

    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));
    formData.append("upload_preset", process.env.CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", folder);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      formData,
      { headers: formData.getHeaders() }
    );

    fs.unlinkSync(filePath); // cleanup temp file
    return response.data;
  } catch (err) {
    console.error("❌ Cloudinary upload error:", err.message);
    throw err;
  }
}

module.exports = { uploadToCloudinary };
