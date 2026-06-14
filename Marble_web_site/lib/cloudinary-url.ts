/** Smaller/faster delivery for portfolio grids (Cloudinary URLs only). Client-safe — no SDK. */
export function cloudinaryDeliveryUrl(src: string, width = 1200): string {
  if (!src.includes("res.cloudinary.com") || !src.includes("/upload/")) {
    return src;
  }
  if (src.includes("/upload/f_auto") || src.includes("/upload/c_")) {
    return src;
  }
  return src.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}
