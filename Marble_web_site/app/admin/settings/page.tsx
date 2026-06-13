import { PasswordSettingsForm } from "@/components/admin/PasswordSettingsForm";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminSettingsPage() {
  await requireAdmin();

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-serif text-3xl font-semibold text-black">Account Settings</h1>
      <p className="mt-1 text-sm text-gray-medium">
        Change your owner login password. This is stored securely in the database.
      </p>
      <div className="mt-8">
        <PasswordSettingsForm />
      </div>
      <p className="mt-6 max-w-md text-xs text-gray-medium">
        First-time setup uses the password from your <code className="text-charcoal">.env</code>{" "}
        file (<code className="text-charcoal">ADMIN_PASSWORD</code>). After you change it here,
        use your new password for all future logins.
      </p>
    </div>
  );
}
