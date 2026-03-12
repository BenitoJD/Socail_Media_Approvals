"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

type TopicRefreshRecord = {
  id: number;
  platform: string;
  handle: string;
  prompt: string;
  createdAt: string;
  updatedAt: string;
};

type TopicRefreshesPageProps = {
  initialTopicRefreshes: TopicRefreshRecord[];
  initialHandleDirectory: Array<{
    platform: string;
    handle: string;
  }>;
};

type PlatformFilter = "ALL" | "Instagram" | "LinkedIn" | "X";

const platformFilters: PlatformFilter[] = ["ALL", "Instagram", "LinkedIn", "X"];

export function TopicRefreshesPage({
  initialTopicRefreshes,
  initialHandleDirectory,
}: TopicRefreshesPageProps) {
  const [topicRefreshes, setTopicRefreshes] = useState(initialTopicRefreshes);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("ALL");
  const [handleFilter, setHandleFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    platform: "",
    handle: "",
    prompt: "",
  });

  const handleOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(
        new Set(topicRefreshes.map((topicRefresh) => topicRefresh.handle.trim())),
      ).sort((a, b) => a.localeCompare(b)),
    ],
    [topicRefreshes],
  );

  const formHandleOptions = useMemo(() => {
    const scoped = initialHandleDirectory.filter((entry) =>
      form.platform ? entry.platform === form.platform : true,
    );

    return Array.from(new Set(scoped.map((entry) => entry.handle))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [form.platform, initialHandleDirectory]);

  const filteredTopicRefreshes = useMemo(() => {
    return topicRefreshes.filter((topicRefresh) => {
      const platformMatches =
        platformFilter === "ALL" ? true : topicRefresh.platform.trim() === platformFilter;
      const handleMatches =
        handleFilter === "ALL" ? true : topicRefresh.handle.trim() === handleFilter;
      return platformMatches && handleMatches;
    });
  }, [handleFilter, platformFilter, topicRefreshes]);

  async function refreshTopicRefreshes() {
    const response = await fetch("/api/topic-refreshes", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Failed to refresh topic refresh rows.");
    }

    setTopicRefreshes((await response.json()) as TopicRefreshRecord[]);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/topic-refreshes", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        });

        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(result?.error || "Failed to save topic refresh.");
        }

        setForm({
          platform: "",
          handle: "",
          prompt: "",
        });
        await refreshTopicRefreshes();
      } catch (topicRefreshError) {
        setError(
          topicRefreshError instanceof Error
            ? topicRefreshError.message
            : "Failed to save topic refresh.",
        );
      }
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-4 px-4 py-4 sm:px-6">
      <section className="rounded-[28px] border border-zinc-200 bg-white/95 px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Topic Refresh
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
              Store one prompt per platform and handle
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              This page uses the agent-ready topic refresh API with one row per account.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-zinc-800"
            >
              Back to posts
            </Link>
            <Link
              href="/topics"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-blue-500"
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

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-[28px] border border-zinc-200 bg-white/95 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">Save prompt</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <select
              value={form.platform}
              onChange={(event) =>
                setForm((current) => ({ ...current, platform: event.target.value }))
              }
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-950"
            >
              <option value="">Select platform</option>
              <option value="Instagram">Instagram</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="X">X</option>
            </select>

            <select
              value={form.handle}
              onChange={(event) =>
                setForm((current) => ({ ...current, handle: event.target.value }))
              }
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-950"
            >
              <option value="">Select handle</option>
              {formHandleOptions.map((handle) => (
                <option key={handle} value={handle}>
                  {handle}
                </option>
              ))}
            </select>

            <textarea
              value={form.prompt}
              onChange={(event) =>
                setForm((current) => ({ ...current, prompt: event.target.value }))
              }
              placeholder="Prompt"
              className="min-h-40 w-full rounded-[24px] border border-zinc-300 px-4 py-4 text-sm outline-none focus:border-zinc-950"
            />

            <button
              type="submit"
              disabled={isPending}
              className="rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {isPending ? "Saving..." : "Save prompt"}
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-zinc-200 bg-white/95 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">Topic refresh table</h2>
              <p className="text-sm text-zinc-500">
                {filteredTopicRefreshes.length} visible row
                {filteredTopicRefreshes.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
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
                className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 outline-none focus:border-zinc-950"
              >
                {handleOptions.map((handle) => (
                  <option key={handle} value={handle}>
                    {handle === "ALL" ? "All handles" : handle}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredTopicRefreshes.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">
              No topic refresh rows match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-zinc-50 text-left text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Platform</th>
                    <th className="px-4 py-3 font-medium">Handle</th>
                    <th className="px-4 py-3 font-medium">Prompt</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTopicRefreshes.map((topicRefresh) => (
                    <tr key={topicRefresh.id} className="border-t border-zinc-200 align-top">
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {topicRefresh.platform}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">{topicRefresh.handle}</td>
                      <td className="max-w-[520px] px-4 py-3 whitespace-pre-wrap text-zinc-900">
                        {topicRefresh.prompt}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {new Date(topicRefresh.updatedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
