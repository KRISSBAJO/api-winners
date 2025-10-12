import dotenv from "dotenv";
import cloudinary from "cloudinary";

dotenv.config();

// ✅ Initialize and configure Cloudinary globally
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/* -------------------------------------------------------------------------- */
/*                               Utility Methods                              */
/* -------------------------------------------------------------------------- */

/**
 * Uploads a file to Cloudinary.
 * @param filePath - The local file path from multer
 * @param folder - Optional folder in Cloudinary
 * @returns secure_url and public_id
 */
export const uploadImage = async (
  filePath: string,
  folder = "dominion_connect/avatars"
) => {
  const result = await cloudinary.v2.uploader.upload(filePath, {
    folder,
    transformation: [{ width: 400, height: 400, crop: "fill" }],
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
};

/**
 * Deletes an image from Cloudinary using its public_id.
 * @param publicId - The Cloudinary public ID
 */
export const deleteImage = async (publicId: string) => {
  if (!publicId) return;
  try {
    await cloudinary.v2.uploader.destroy(publicId);
    console.log(`🗑️ Deleted image from Cloudinary: ${publicId}`);
  } catch (err) {
    console.error("Failed to delete image:", err);
  }
};

export default cloudinary.v2;
