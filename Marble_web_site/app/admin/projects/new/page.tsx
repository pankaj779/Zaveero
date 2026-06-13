import { ProjectForm } from "@/components/admin/ProjectForm";
import { requireAdmin } from "@/lib/admin-auth";

export default async function NewProjectPage() {
  await requireAdmin();

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-serif text-3xl font-semibold text-black">New Project</h1>
      <p className="mt-1 text-sm text-gray-medium">
        Add a new portfolio project with photos and videos
      </p>
      <div className="mt-8 max-w-4xl">
        <ProjectForm />
      </div>
    </div>
  );
}
