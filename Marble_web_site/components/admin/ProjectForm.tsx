"use client";

import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { PROJECT_CATEGORIES } from "@/lib/constants";
import { ImagePlus, Upload, Video, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

type ProjectFormProps = {
  initial?: {
    id: string;
    name: string;
    clientName: string;
    location: string;
    description: string;
    category: string;
    photos: string[];
    videos: string[];
    featured: boolean;
    sortOrder: number;
  };
};

export function ProjectForm({ initial }: ProjectFormProps) {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [videos, setVideos] = useState<string[]>(initial?.videos ?? []);
  const [photoUrl, setPhotoUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "photo" | "video"
  ) {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        if (initial?.id) formData.append("projectId", initial.id);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Upload failed. Please log in again.");
        }
        const { url } = await res.json();

        if (type === "photo") {
          setPhotos((prev) => [...prev, url]);
        } else {
          setVideos((prev) => [...prev, url]);
        }
      }
      setSuccess(
        type === "photo"
          ? `${files.length} photo(s) uploaded successfully.`
          : `${files.length} video(s) uploaded successfully.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "File upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      clientName: (form.elements.namedItem("clientName") as HTMLInputElement).value,
      location: (form.elements.namedItem("location") as HTMLInputElement).value,
      description: (form.elements.namedItem("description") as HTMLTextAreaElement).value,
      category: (form.elements.namedItem("category") as HTMLSelectElement).value,
      featured: (form.elements.namedItem("featured") as HTMLInputElement).checked,
      sortOrder: parseInt(
        (form.elements.namedItem("sortOrder") as HTMLInputElement).value || "0"
      ),
      photos,
      videos,
    };

    try {
      const url = initial ? `/api/projects/${initial.id}` : "/api/projects";
      const method = initial ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save project");
      }
      router.push("/admin/projects");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Photos & Videos — prominent section at top */}
      <div className="border-2 border-gold/40 bg-gold/5 p-6">
        <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-black">
          <ImagePlus size={22} className="text-gold" />
          Project Photos & Videos
        </h2>
        <p className="mt-2 text-sm text-gray-medium">
          Upload images and videos from your device, or paste URLs. These will appear in the
          portfolio gallery on the website.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Photos */}
          <div className="rounded border border-gray-200 bg-white p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
              <ImagePlus size={16} className="text-gold" /> Photos
            </h3>
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="Paste image URL (Unsplash, etc.)"
                className="flex-1 border border-gray-300 px-3 py-2 text-sm"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (photoUrl.trim()) {
                    setPhotos((p) => [...p, photoUrl.trim()]);
                    setPhotoUrl("");
                  }
                }}
              >
                Add URL
              </Button>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e, "photo")}
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="w-full"
              disabled={uploading}
              onClick={() => photoInputRef.current?.click()}
            >
              <Upload size={16} className="mr-2" />
              {uploading ? "Uploading..." : "Choose Photo Files from Device"}
            </Button>
            {photos.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {photos.map((photo, i) => (
                  <div key={`${photo}-${i}`} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt="" className="h-20 w-20 border object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                      className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-medium">{photos.length} photo(s) added</p>
          </div>

          {/* Videos */}
          <div className="rounded border border-gray-200 bg-white p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
              <Video size={16} className="text-gold" /> Videos
            </h3>
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Paste video URL"
                className="flex-1 border border-gray-300 px-3 py-2 text-sm"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (videoUrl.trim()) {
                    setVideos((v) => [...v, videoUrl.trim()]);
                    setVideoUrl("");
                  }
                }}
              >
                Add URL
              </Button>
            </div>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e, "video")}
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="w-full"
              disabled={uploading}
              onClick={() => videoInputRef.current?.click()}
            >
              <Upload size={16} className="mr-2" />
              {uploading ? "Uploading..." : "Choose Video Files from Device"}
            </Button>
            {videos.length > 0 && (
              <div className="mt-4 space-y-2">
                {videos.map((video, i) => (
                  <div key={`${video}-${i}`} className="flex items-center gap-2 rounded bg-gray-50 p-2 text-sm">
                    <span className="flex-1 truncate">{video}</span>
                    <button
                      type="button"
                      onClick={() => setVideos((v) => v.filter((_, j) => j !== i))}
                      className="text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-medium">{videos.length} video(s) added</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Input name="name" label="Project Name" required defaultValue={initial?.name} />
        <Input name="clientName" label="Client Name" required defaultValue={initial?.clientName} />
        <Input name="location" label="Location" required defaultValue={initial?.location} />
        <div>
          <label className="mb-2 block text-sm font-medium text-charcoal">Category</label>
          <select
            name="category"
            defaultValue={initial?.category ?? "marble"}
            className="w-full border border-gray-300 bg-white px-4 py-3 text-sm"
          >
            {PROJECT_CATEGORIES.filter((c) => c.value !== "all").map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <Input
          name="sortOrder"
          label="Sort Order"
          type="number"
          defaultValue={initial?.sortOrder ?? 0}
        />
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={initial?.featured}
              className="h-4 w-4 accent-gold"
            />
            Featured Project
          </label>
        </div>
      </div>

      <Textarea
        name="description"
        label="Description"
        required
        rows={4}
        defaultValue={initial?.description}
      />

      {success && <p className="text-sm text-green-600">{success}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-4">
        <Button type="submit" variant="primary" disabled={loading || uploading}>
          {loading ? "Saving..." : initial ? "Update Project" : "Create Project"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
