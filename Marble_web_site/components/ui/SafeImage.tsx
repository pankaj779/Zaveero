import Image, { ImageProps } from "next/image";

type SafeImageProps = Omit<ImageProps, "src"> & {
  src: string;
};

/**
 * Renders images with unoptimized mode to avoid Next.js image optimizer 500 errors
 * in development and with external/local upload URLs.
 */
export function SafeImage({ src, alt, ...props }: SafeImageProps) {
  return <Image src={src} alt={alt} unoptimized {...props} />;
}
