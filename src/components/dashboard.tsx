"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useState, useTransition } from "react";

import { getPublicImageUrl } from "@/lib/minio-public";

type ImageRecord = {
  id: number;
  objectKey: string;
  imageUrl: string;
};

type PostRecord = {
  id: number;
  platform: string | null;
  handle: string | null;
  text: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  agentPostingStatus: "NOT_POSTED" | "CLAIMED" | "POSTED" | "FAILED";
  claimedAt: string | null;
  postedAt: string | null;
  lastAttemptedAt: string | null;
  failureReason: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  images: ImageRecord[];
};

type DashboardProps = {
  initialPosts: PostRecord[];
  initialSelectedPostId: number | null;
};

type UploadResponse = {
  uploads: Array<{ objectKey: string; imageUrl: string }>;
};

type StatusFilter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";
type PlatformFilter = "ALL" | "Instagram" | "LinkedIn" | "X";
type SortBy = "pending-first" | "newest" | "oldest";
type LastAction = {
  id: number;
  previousStatus: PostRecord["status"];
  nextStatus: PostRecord["status"];
} | null;

const statusFilters: StatusFilter[] = ["PENDING", "APPROVED", "REJECTED", "ALL"];
const platformFilters: PlatformFilter[] = ["ALL", "Instagram", "LinkedIn", "X"];

function getPlatformMark(platform: string | null) {
  if (platform === "Instagram") return "IG";
  if (platform === "LinkedIn") return "IN";
  if (platform === "X") return "X";
  return "?";
}

function getStatusClasses(status: PostRecord["status"]) {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-700";
  if (status === "REJECTED") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

function getPostingStatusClasses(status: PostRecord["agentPostingStatus"]) {
  if (status === "POSTED") return "bg-sky-100 text-sky-700";
  if (status === "CLAIMED") return "bg-indigo-100 text-indigo-700";
  if (status === "FAILED") return "bg-rose-100 text-rose-700";
  return "bg-zinc-200 text-zinc-700";
}

function getPostingStatusLabel(status: PostRecord["agentPostingStatus"]) {
  if (status === "POSTED") return "Posted";
  if (status === "CLAIMED") return "Claimed";
  if (status === "FAILED") return "Failed";
  return "Not posted";
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

export function Dashboard({
  initialPosts,
  initialSelectedPostId,
}: DashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initiallyLinkedPost =
    initialSelectedPostId !== null
      ? initialPosts.find((post) => post.id === initialSelectedPostId) ?? null
      : null;
  const [posts, setPosts] = useState(initialPosts);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    initiallyLinkedPost ? "ALL" : "PENDING",
  );
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("ALL");
  const [handleFilter, setHandleFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortBy>("pending-first");
  const [selectedPostId, setSelectedPostId] = useState<number | null>(
    initiallyLinkedPost?.id ??
      initialPosts.find((post) => post.status === "PENDING")?.id ??
      initialPosts[0]?.id ??
      null,
  );
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<LastAction>(null);
  const [isPending, startTransition] = useTransition();
  const [uploadingCreateImages, setUploadingCreateImages] = useState(false);
  const [uploadingEditImages, setUploadingEditImages] = useState(false);
  const [createForm, setCreateForm] = useState({
    platform: "",
    handle: "",
    text: "",
    images: "",
  });
  const [editForm, setEditForm] = useState({
    platform: "",
    handle: "",
    text: "",
    images: "",
  });

  const filteredPosts = useMemo(() => {
    return [...posts]
      .filter((post) => (statusFilter === "ALL" ? true : post.status === statusFilter))
      .filter((post) =>
        platformFilter === "ALL" ? true : (post.platform || "").trim() === platformFilter,
      )
      .filter((post) =>
        handleFilter === "ALL" ? true : (post.handle || "").trim() === handleFilter,
      )
      .sort((left, right) => {
        if (sortBy === "oldest") {
          return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
        }

        if (sortBy === "pending-first") {
          const weight = { PENDING: 0, APPROVED: 1, REJECTED: 2 };
          const byStatus = weight[left.status] - weight[right.status];
          if (byStatus !== 0) {
            return byStatus;
          }
        }

        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
  }, [handleFilter, platformFilter, posts, sortBy, statusFilter]);

  const handleOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(
        new Set(
          posts
            .map((post) => post.handle?.trim())
            .filter((handle): handle is string => Boolean(handle)),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    ],
    [posts],
  );

  const composerHandleOptions = useMemo(() => {
    const scoped = posts
      .filter((post) =>
        createForm.platform ? (post.platform || "").trim() === createForm.platform : true,
      )
      .map((post) => post.handle?.trim())
      .filter((handle): handle is string => Boolean(handle));

    return Array.from(new Set(scoped)).sort((left, right) => left.localeCompare(right));
  }, [createForm.platform, posts]);

  const pendingPosts = useMemo(
    () => filteredPosts.filter((post) => post.status === "PENDING"),
    [filteredPosts],
  );

  const selectedPost =
    filteredPosts.find((post) => post.id === selectedPostId) ??
    pendingPosts[0] ??
    filteredPosts[0] ??
    null;

  const selectedIndex = selectedPost
    ? filteredPosts.findIndex((post) => post.id === selectedPost.id)
    : -1;

  const counts = {
    total: posts.length,
    pending: posts.filter((post) => post.status === "PENDING").length,
    approved: posts.filter((post) => post.status === "APPROVED").length,
    rejected: posts.filter((post) => post.status === "REJECTED").length,
  };

  const reviewedCount = counts.approved + counts.rejected;

  useEffect(() => {
    if (!selectedPostId && filteredPosts.length > 0) {
      setSelectedPostId(filteredPosts[0].id);
      return;
    }

    if (selectedPostId && !filteredPosts.some((post) => post.id === selectedPostId)) {
      setSelectedPostId(filteredPosts[0]?.id ?? null);
    }
  }, [filteredPosts, selectedPostId]);

  useEffect(() => {
    const currentPostParam = searchParams.get("post");
    const nextPostParam = selectedPostId ? String(selectedPostId) : null;

    if (currentPostParam === nextPostParam) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextPostParam) {
      nextParams.set("post", nextPostParam);
    } else {
      nextParams.delete("post");
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, selectedPostId]);

  function navigateSelection(direction: 1 | -1) {
    if (!filteredPosts.length) {
      return;
    }

    const currentIndex =
      selectedIndex >= 0 ? selectedIndex : 0;
    const nextIndex = Math.min(
      Math.max(currentIndex + direction, 0),
      filteredPosts.length - 1,
    );
    setSelectedPostId(filteredPosts[nextIndex].id);
  }

  async function refreshPosts() {
    const response = await fetch("/api/posts", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Failed to refresh posts.");
    }

    setPosts((await response.json()) as PostRecord[]);
  }

  async function uploadFiles(files: FileList | null): Promise<UploadResponse> {
    if (!files || files.length === 0) {
      return { uploads: [] };
    }

    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append("files", file);
    }

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(result?.error || "Failed to upload images.");
    }

    return (await response.json()) as UploadResponse;
  }

  function startEditing(post: PostRecord) {
    setEditingPostId(post.id);
    setSelectedPostId(post.id);
    setEditForm({
      platform: post.platform || "",
      handle: post.handle || "",
      text: post.text,
      images: post.images.map((image) => image.objectKey).join("\n"),
    });
  }

  function cancelEditing() {
    setEditingPostId(null);
    setEditForm({
      platform: "",
      handle: "",
      text: "",
      images: "",
    });
  }

  function getNextPendingId(currentId: number) {
    const queue = filteredPosts;
    const currentIndex = queue.findIndex((post) => post.id === currentId);

    for (let index = currentIndex + 1; index < queue.length; index += 1) {
      if (queue[index].status === "PENDING") {
        return queue[index].id;
      }
    }

    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      if (queue[index].status === "PENDING") {
        return queue[index].id;
      }
    }

    return queue.find((post) => post.id !== currentId)?.id ?? null;
  }

  async function handleCreateImageUpload(files: FileList | null) {
    setError(null);
    setUploadingCreateImages(true);

    try {
      const result = await uploadFiles(files);
      setCreateForm((current) => ({
        ...current,
        images: [
          ...current.images.split("\n").map((item) => item.trim()).filter(Boolean),
          ...result.uploads.map((item) => item.objectKey),
        ].join("\n"),
      }));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Failed to upload images.",
      );
    } finally {
      setUploadingCreateImages(false);
    }
  }

  async function handleEditImageUpload(files: FileList | null) {
    setError(null);
    setUploadingEditImages(true);

    try {
      const result = await uploadFiles(files);
      setEditForm((current) => ({
        ...current,
        images: [
          ...current.images.split("\n").map((item) => item.trim()).filter(Boolean),
          ...result.uploads.map((item) => item.objectKey),
        ].join("\n"),
      }));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Failed to upload images.",
      );
    } finally {
      setUploadingEditImages(false);
    }
  }

  function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            platform: createForm.platform,
            handle: createForm.handle,
            text: createForm.text,
            images: createForm.images.split("\n").map((item) => item.trim()).filter(Boolean),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create post.");
        }

        const created = (await response.json()) as PostRecord;
        setCreateForm({
          platform: "",
          handle: "",
          text: "",
          images: "",
        });
        setShowComposer(false);
        await refreshPosts();
        setSelectedPostId(created.id);
      } catch (createError) {
        setError(
          createError instanceof Error ? createError.message : "Failed to create post.",
        );
      }
    });
  }

  async function handleReview(postId: number, status: PostRecord["status"]) {
    const previous = posts.find((post) => post.id === postId);
    if (!previous) {
      return;
    }

    const nextPendingId = getNextPendingId(postId);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/posts/${postId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) {
          throw new Error("Failed to update post.");
        }

        const updated = (await response.json()) as PostRecord;
        setPosts((current) =>
          current.map((post) => (post.id === updated.id ? updated : post)),
        );
        setLastAction({
          id: postId,
          previousStatus: previous.status,
          nextStatus: status,
        });
        if (status !== "PENDING") {
          setSelectedPostId(nextPendingId);
        } else {
          setSelectedPostId(postId);
        }
      } catch (updateError) {
        setError(
          updateError instanceof Error ? updateError.message : "Failed to update post.",
        );
      }
    });
  }

  const onKeyboardShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (isTypingTarget(event.target) || !selectedPost) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateSelection(1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateSelection(-1);
      return;
    }

    if (event.key.toLowerCase() === "e") {
      event.preventDefault();
      if (editingPostId === selectedPost.id) {
        cancelEditing();
      } else {
        startEditing(selectedPost);
      }
      return;
    }

    if (editingPostId === selectedPost.id) {
      return;
    }

    if (event.key.toLowerCase() === "a") {
      event.preventDefault();
      void handleReview(selectedPost.id, "APPROVED");
      return;
    }

    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      void handleReview(selectedPost.id, "REJECTED");
    }
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      onKeyboardShortcut(event);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleEditSubmit(postId: number) {
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/posts/${postId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            platform: editForm.platform,
            handle: editForm.handle,
            text: editForm.text,
            images: editForm.images.split("\n").map((item) => item.trim()).filter(Boolean),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save post.");
        }

        const updated = (await response.json()) as PostRecord;
        setPosts((current) =>
          current.map((post) => (post.id === updated.id ? updated : post)),
        );
        cancelEditing();
        setSelectedPostId(updated.id);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Failed to save post.");
      }
    });
  }

  function handleBulkApprove() {
    const ids = filteredPosts
      .filter((post) => post.status === "PENDING")
      .slice(0, 25)
      .map((post) => post.id);

    if (ids.length === 0) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await Promise.all(
          ids.map((id) =>
            fetch(`/api/posts/${id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ status: "APPROVED" }),
            }),
          ),
        );
        await refreshPosts();
        setLastAction(null);
      } catch {
        setError("Failed to bulk approve posts.");
      }
    });
  }

  function handleUndo() {
    if (!lastAction) {
      return;
    }

    const action = lastAction;
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/posts/${action.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: action.previousStatus }),
        });

        if (!response.ok) {
          throw new Error("Failed to undo action.");
        }

        const updated = (await response.json()) as PostRecord;
        setPosts((current) =>
          current.map((post) => (post.id === updated.id ? updated : post)),
        );
        setSelectedPostId(updated.id);
        setLastAction(null);
      } catch (undoError) {
        setError(undoError instanceof Error ? undoError.message : "Failed to undo action.");
      }
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6">
      <section className="rounded-[28px] border border-zinc-200 bg-white/95 px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Content Review Queue
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
              Review fast. Decide once.
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-zinc-950 px-4 py-3 text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-300">Total</p>
              <p className="mt-1 text-2xl font-semibold">{counts.total}</p>
            </div>
            <div className="rounded-2xl bg-amber-100 px-4 py-3 text-amber-900">
              <p className="text-xs uppercase tracking-[0.18em]">Pending</p>
              <p className="mt-1 text-2xl font-semibold">{counts.pending}</p>
            </div>
            <div className="rounded-2xl bg-emerald-100 px-4 py-3 text-emerald-900">
              <p className="text-xs uppercase tracking-[0.18em]">Approved</p>
              <p className="mt-1 text-2xl font-semibold">{counts.approved}</p>
            </div>
            <div className="rounded-2xl bg-red-100 px-4 py-3 text-red-900">
              <p className="text-xs uppercase tracking-[0.18em]">Rejected</p>
              <p className="mt-1 text-2xl font-semibold">{counts.rejected}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  statusFilter === value
                    ? "bg-zinc-950 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-3 xl:justify-end">
            <select
              value={platformFilter}
              onChange={(event) => setPlatformFilter(event.target.value as PlatformFilter)}
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 outline-none focus:border-zinc-950"
            >
              {platformFilters.map((platform) => (
                <option key={platform} value={platform}>
                  {platform === "ALL" ? "All platforms" : platform}
                </option>
              ))}
            </select>

            <select
              value={handleFilter}
              onChange={(event) => setHandleFilter(event.target.value)}
              className="min-w-44 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 outline-none focus:border-zinc-950"
            >
              {handleOptions.map((handle) => (
                <option key={handle} value={handle}>
                  {handle === "ALL" ? "All handles" : handle}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortBy)}
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 outline-none focus:border-zinc-950"
            >
              <option value="pending-first">Pending first</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>

            <button
              type="button"
              onClick={() => setShowComposer(true)}
              className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              New post
            </button>

            <Link
              href="/topics"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              View topics
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid min-h-[calc(100vh-220px)] gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col rounded-[28px] border border-zinc-200 bg-white/95 shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-950">Review Queue</h2>
                <p className="text-sm text-zinc-500">
                  {reviewedCount} / {counts.total} reviewed
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Visible</p>
                <p className="text-lg font-semibold text-zinc-950">{filteredPosts.length}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleBulkApprove}
                disabled={isPending || pendingPosts.length === 0}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Approve visible
              </button>
              <button
                type="button"
                onClick={handleUndo}
                disabled={isPending || !lastAction}
                className="rounded-full bg-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:bg-zinc-100"
              >
                Undo last
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {filteredPosts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">
                No posts match this view.
              </div>
            ) : (
              filteredPosts.map((post, index) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => {
                    setSelectedPostId(post.id);
                    if (editingPostId && editingPostId !== post.id) {
                      cancelEditing();
                    }
                  }}
                  className={`w-full rounded-[24px] border p-3 text-left shadow-sm transition ${
                    selectedPost?.id === post.id
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-white hover:border-zinc-400"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${
                          selectedPost?.id === post.id
                            ? "bg-white/15 text-white"
                            : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {getPlatformMark(post.platform)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {post.handle || "No handle"}
                        </p>
                        <p
                          className={`mt-0.5 text-xs ${
                            selectedPost?.id === post.id ? "text-zinc-300" : "text-zinc-500"
                          }`}
                        >
                          {post.platform || "Unknown platform"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        selectedPost?.id === post.id
                          ? "bg-white/15 text-white"
                          : getStatusClasses(post.status)
                      }`}
                    >
                      {post.status}
                    </span>
                  </div>

                  <div className="mt-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        selectedPost?.id === post.id
                          ? "bg-white/15 text-white"
                          : getPostingStatusClasses(post.agentPostingStatus)
                      }`}
                    >
                      {getPostingStatusLabel(post.agentPostingStatus)}
                    </span>
                  </div>

                  <p
                    className={`mt-3 line-clamp-3 text-sm leading-6 ${
                      selectedPost?.id === post.id ? "text-zinc-200" : "text-zinc-700"
                    }`}
                  >
                    {post.text}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex -space-x-2">
                      {post.images.slice(0, 3).map((image) => (
                        <span
                          key={image.id}
                          className={`relative block h-9 w-9 overflow-hidden rounded-xl border-2 ${
                            selectedPost?.id === post.id
                              ? "border-zinc-950"
                              : "border-white"
                          }`}
                        >
                          <Image
                            src={image.imageUrl}
                            alt={image.objectKey}
                            fill
                            className="object-cover"
                            sizes="36px"
                            unoptimized
                          />
                        </span>
                      ))}
                    </div>
                    <p
                      className={`text-xs ${
                        selectedPost?.id === post.id ? "text-zinc-300" : "text-zinc-500"
                      }`}
                    >
                      {index + 1}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="rounded-[28px] border border-zinc-200 bg-white/95 shadow-sm">
          {!selectedPost ? (
            <div className="flex h-full min-h-[520px] items-center justify-center px-6 text-center text-sm text-zinc-500">
              No post selected.
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="border-b border-zinc-200 px-5 py-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                          {selectedPost.platform || "Unknown"}
                        </span>
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500">
                        {selectedPost.handle || "No handle"}
                      </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                            selectedPost.status,
                          )}`}
                        >
                          {selectedPost.status}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getPostingStatusClasses(
                            selectedPost.agentPostingStatus,
                          )}`}
                        >
                          {getPostingStatusLabel(selectedPost.agentPostingStatus)}
                        </span>
                      </div>
                    <p className="mt-3 text-sm text-zinc-500">
                      {selectedIndex + 1} / {filteredPosts.length} in current queue
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-400">
                      Shortcuts: A approve, R reject, E edit, ← → navigate
                    </p>
                    <div className="mt-3">
                      <Link
                        href={`/?post=${selectedPost.id}`}
                        className="text-sm font-medium text-blue-600 underline-offset-4 hover:underline"
                      >
                        Open direct link
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {editingPostId === selectedPost.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleEditSubmit(selectedPost.id)}
                          disabled={isPending || uploadingEditImages}
                          className="rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={isPending}
                          className="rounded-2xl bg-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:bg-zinc-100"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditing(selectedPost)}
                          disabled={isPending}
                          className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleReview(selectedPost.id, "APPROVED")}
                          disabled={isPending}
                          className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleReview(selectedPost.id, "REJECTED")}
                          disabled={isPending}
                          className="rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleReview(selectedPost.id, "PENDING")}
                          disabled={isPending}
                          className="rounded-2xl bg-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:bg-zinc-100"
                        >
                          Reset
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid flex-1 gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-4">
                  {editingPostId === selectedPost.id ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <select
                          value={editForm.platform}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              platform: event.target.value,
                            }))
                          }
                          className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-950"
                        >
                          <option value="">Select platform</option>
                          <option value="Instagram">Instagram</option>
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="X">X</option>
                        </select>
                        <input
                          value={editForm.handle}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              handle: event.target.value,
                            }))
                          }
                          placeholder="@handle"
                          className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                        />
                      </div>

                      <textarea
                        value={editForm.text}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            text: event.target.value,
                          }))
                        }
                        className="min-h-72 w-full rounded-[24px] border border-zinc-300 px-4 py-4 text-[15px] leading-7 text-zinc-800 outline-none focus:border-zinc-950"
                      />

                      <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-zinc-950">Images</h3>
                            <p className="text-xs text-zinc-500">
                              Upload multiple images or edit object keys directly.
                            </p>
                          </div>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(event) => {
                              void handleEditImageUpload(event.target.files);
                              event.target.value = "";
                            }}
                            className="block max-w-full text-sm text-zinc-600 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-950 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-zinc-800"
                          />
                        </div>
                        <textarea
                          value={editForm.images}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              images: event.target.value,
                            }))
                          }
                          className="mt-3 min-h-28 w-full rounded-2xl border border-zinc-300 px-4 py-3 font-mono text-sm outline-none focus:border-zinc-950"
                          placeholder={"posts/1/main.jpg\nposts/1/alt.jpg"}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-5">
                        <p className="whitespace-pre-wrap text-[16px] leading-8 text-zinc-800">
                          {selectedPost.text}
                        </p>
                      </div>

                      {selectedPost.images.length > 0 ? (
                        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                          {selectedPost.images.map((image) => (
                            <a
                              key={image.id}
                              href={image.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="group overflow-hidden rounded-[24px] border border-zinc-200 bg-zinc-50"
                            >
                              <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
                                <Image
                                  src={image.imageUrl}
                                  alt={image.objectKey}
                                  fill
                                  className="object-cover transition duration-300 group-hover:scale-110"
                                  sizes="(max-width: 1280px) 50vw, 33vw"
                                  unoptimized
                                />
                              </div>
                              <p className="truncate px-3 py-2 font-mono text-xs text-zinc-500">
                                {image.objectKey}
                              </p>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-[24px] border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">
                          No images attached.
                        </div>
                      )}
                    </>
                  )}
                </div>

                <aside className="space-y-4">
                  <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
                    <h3 className="text-sm font-semibold text-zinc-950">Post details</h3>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-500">Handle</span>
                        <span className="font-medium text-zinc-900">
                          {selectedPost.handle || "No handle"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-500">Platform</span>
                        <span className="font-medium text-zinc-900">
                          {selectedPost.platform || "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-500">Created</span>
                        <span className="font-medium text-zinc-900">
                          {new Date(selectedPost.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-500">Updated</span>
                        <span className="font-medium text-zinc-900">
                          {new Date(selectedPost.updatedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-500">Images</span>
                        <span className="font-medium text-zinc-900">
                          {selectedPost.images.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-500">Posting</span>
                        <span className="font-medium text-zinc-900">
                          {getPostingStatusLabel(selectedPost.agentPostingStatus)}
                        </span>
                      </div>
                      {selectedPost.claimedAt ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-zinc-500">Claimed at</span>
                          <span className="font-medium text-zinc-900">
                            {new Date(selectedPost.claimedAt).toLocaleString()}
                          </span>
                        </div>
                      ) : null}
                      {selectedPost.postedAt ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-zinc-500">Posted at</span>
                          <span className="font-medium text-zinc-900">
                            {new Date(selectedPost.postedAt).toLocaleString()}
                          </span>
                        </div>
                      ) : null}
                      {selectedPost.lastAttemptedAt ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-zinc-500">Last attempt</span>
                          <span className="font-medium text-zinc-900">
                            {new Date(selectedPost.lastAttemptedAt).toLocaleString()}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-500">Retry count</span>
                        <span className="font-medium text-zinc-900">
                          {selectedPost.retryCount}
                        </span>
                      </div>
                      {selectedPost.failureReason ? (
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-zinc-500">Failure reason</span>
                          <span className="max-w-[220px] text-right font-medium text-zinc-900">
                            {selectedPost.failureReason}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
                    <h3 className="text-sm font-semibold text-zinc-950">Queue progress</h3>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-200">
                      <div
                        className="h-full rounded-full bg-zinc-950"
                        style={{
                          width: `${counts.total === 0 ? 0 : (reviewedCount / counts.total) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="mt-3 text-sm text-zinc-600">
                      {reviewedCount} reviewed, {counts.pending} still pending.
                    </p>
                  </div>
                </aside>
              </div>
            </div>
          )}
        </section>
      </section>

      {showComposer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-zinc-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Manual Post
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-zinc-950">Create post</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowComposer(false)}
                className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <select
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-950"
                  value={createForm.platform}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      platform: event.target.value,
                    }))
                  }
                >
                  <option value="">Select platform</option>
                  <option value="Instagram">Instagram</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="X">X</option>
                </select>
                <select
                  value={createForm.handle}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      handle: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-950"
                >
                  <option value="">Select handle</option>
                  {composerHandleOptions.map((handle) => (
                    <option key={handle} value={handle}>
                      {handle}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                value={createForm.text}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    text: event.target.value,
                  }))
                }
                placeholder="Write or paste the post text"
                required
                className="min-h-56 w-full rounded-[24px] border border-zinc-300 px-4 py-4 text-[15px] leading-7 outline-none focus:border-zinc-950"
              />

              <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950">Images</h3>
                    <p className="text-xs text-zinc-500">
                      Upload one or more images or paste object keys manually.
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(event) => {
                      void handleCreateImageUpload(event.target.files);
                      event.target.value = "";
                    }}
                    className="block max-w-full text-sm text-zinc-600 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-950 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-zinc-800"
                  />
                </div>
                {createForm.images ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {createForm.images
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean)
                      .map((objectKey) => (
                        <a
                          key={objectKey}
                          href={getPublicImageUrl(objectKey)}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate rounded-2xl bg-white px-3 py-2 font-mono text-xs text-zinc-600"
                        >
                          {objectKey}
                        </a>
                      ))}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowComposer(false)}
                  className="rounded-2xl bg-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || uploadingCreateImages}
                  className="rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {isPending ? "Saving..." : "Create post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
