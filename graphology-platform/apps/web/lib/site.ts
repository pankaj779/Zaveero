/**
 * Compatibility facade — prefer importing from lib/brand, lib/config, lib/seo, etc.
 */
import { navigationConfig } from './config/navigation.config';
import { footerConfig } from './config/footer.config';

export { brandConfig } from './brand/brand.config';
export { navigationConfig, footerConfig };

/** @deprecated Prefer navigationConfig.primary */
export const mainNav = navigationConfig.primary;

/** @deprecated Prefer footerConfig.columns */
export const footerColumns = footerConfig.columns;
