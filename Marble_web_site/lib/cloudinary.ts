import { v2 as cloudinary } from "cloudinary";

function requireCloudinaryConfig() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Cloudinary is not configured (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).");
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  return cloudinary;
}

export async function uploadToCloudinary(
  buffer: Buffer,
  options: {
    folder: string;
    resourceType: "image" | "video" | "auto";
    filename?: string;
  },
): Promise<{ url: string; publicId: string; resourceType: string }> {
  const cld = requireCloudinaryConfig();
  return new Promise((resolve, reject) => {
    const stream = cld.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: options.resourceType,
        public_id: options.filename,
        overwrite: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error ?? new Error("Cloudinary upload returned no URL"));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type ?? options.resourceType,
        });
      },
    );
    stream.end(buffer);
  });
}
