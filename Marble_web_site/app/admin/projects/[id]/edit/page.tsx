import { ProjectForm } from "@/components/admin/ProjectForm";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { parseJsonArray } from "@/lib/utils";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditProjectPage({ params }: PageProps) {
  await requireAdmin();

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });

  if (!project) notFound();

  return (
    <div className="p-6 md:p-10">
      <h1 className="font-serif text-3xl font-semibold text-black">Edit Project</h1>
      <p className="mt-1 text-sm text-gray-medium">{project.name}</p>
      <div className="mt-8 max-w-4xl">
        <ProjectForm
          initial={{
            ...project,
            photos: parseJsonArray(project.photos),
            videos: parseJsonArray(project.videos),
          }}
        />
      </div>
    </div>
  );
}
