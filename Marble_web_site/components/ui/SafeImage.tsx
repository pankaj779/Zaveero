import { cloudinaryDeliveryUrl } from "@/lib/cloudinary";
import Image, { ImageProps } from "next/image";

type SafeImageProps = Omit<ImageProps, "src"> & {
  src: string;
  /** Max width for Cloudinary delivery (ignored for other URLs). */
  deliveryWidth?: number;
};

export function SafeImage({ src, alt, deliveryWidth = 1200, ...props }: SafeImageProps) {
  const resolved = cloudinaryDeliveryUrl(src, deliveryWidth);
  const isCloudinary = resolved.includes("res.cloudinary.com");
  return (
    <Image
      src={resolved}
      alt={alt}
      unoptimized={!isCloudinary}
      {...props}
    />
  );
}
