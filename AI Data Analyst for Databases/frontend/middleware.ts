export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/chat/:path*",
    "/connections/:path*",
    "/history/:path*",
    "/lineage/:path*",
    "/reports/:path*",
    "/dashboards/:path*",
    "/account/:path*",
    "/team/:path*",
    "/audit/:path*",
    "/crawler/:path*",
  ],
};
