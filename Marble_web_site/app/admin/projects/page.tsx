import { DeleteProjectButton } from "@/components/admin/DeleteProjectButton";
import { Button } from "@/components/ui/Button";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { parseJsonArray } from "@/lib/utils";
import { Pencil, Plus } from "lucide-react";
import Link from "next/link";

export default async function AdminProjectsPage() {
  await requireAdmin();

  const projects = await prisma.project.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="p-6 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-black">Projects</h1>
          <p className="mt-1 text-sm text-gray-medium">
            Manage portfolio projects and media
          </p>
        </div>
        <Link href="/admin/projects/new">
          <Button variant="primary" size="sm">
            <Plus size={16} className="mr-2" />
            Add Project
          </Button>
        </Link>
      </div>

      <div className="mt-8 overflow-x-auto border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-medium">
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Media</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const photos = parseJsonArray(project.photos);
              const videos = parseJsonArray(project.videos);
              return (
                <tr key={project.id} className="border-b">
                  <td className="px-4 py-3 text-sm font-medium">{project.name}</td>
                  <td className="px-4 py-3 text-sm">{project.clientName}</td>
                  <td className="px-4 py-3 text-sm">{project.location}</td>
                  <td className="px-4 py-3 text-sm capitalize">{project.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-medium">
                    {photos.length} photos, {videos.length} videos
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/projects/${project.id}/edit`}
                        className="text-gray-medium hover:text-gold"
                      >
                        <Pencil size={16} />
                      </Link>
                      <DeleteProjectButton id={project.id} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {projects.length === 0 && (
          <p className="p-8 text-center text-sm text-gray-medium">
            No projects yet. Add your first project.
          </p>
        )}
      </div>
    </div>
  );
}
