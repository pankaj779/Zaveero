"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedOrganizationSchema = exports.seedSystemSettingSchema = exports.seedPermissionSchema = exports.seedRoleSchema = exports.seedAdminEnvSchema = exports.prisma = void 0;
var client_js_1 = require("./client.js");
Object.defineProperty(exports, "prisma", { enumerable: true, get: function () { return client_js_1.prisma; } });
var seed_schema_js_1 = require("./validation/seed.schema.js");
Object.defineProperty(exports, "seedAdminEnvSchema", { enumerable: true, get: function () { return seed_schema_js_1.seedAdminEnvSchema; } });
Object.defineProperty(exports, "seedRoleSchema", { enumerable: true, get: function () { return seed_schema_js_1.seedRoleSchema; } });
Object.defineProperty(exports, "seedPermissionSchema", { enumerable: true, get: function () { return seed_schema_js_1.seedPermissionSchema; } });
Object.defineProperty(exports, "seedSystemSettingSchema", { enumerable: true, get: function () { return seed_schema_js_1.seedSystemSettingSchema; } });
Object.defineProperty(exports, "seedOrganizationSchema", { enumerable: true, get: function () { return seed_schema_js_1.seedOrganizationSchema; } });
//# sourceMappingURL=index.js.map