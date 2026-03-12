"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

type TopicRecord = {
  id: number;
  platform: string;
  handle: string;
  topic: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type TopicsPageProps = {
  initialTopics: TopicRecord[];
  initialHandleDirectory: Array<{
    platform: string;
    handle: string;
  }>;
};

type PlatformFilter = "ALL" | "Instagram" | "LinkedIn" | "X";

const platformFilters: PlatformFilter[] = ["ALL", "Instagram", "LinkedIn", "X"];

export function TopicsPage({ initialTopics, initialHandleDirectory }: TopicsPageProps) {
  const [topics, setTopics] = useState(initialTopics);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("ALL");
  const [handleFilter, setHandleFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [topicForm, setTopicForm] = useState({
    platform: "",
    handle: "",
    topic: "",
    notes: "",
  });

  const handleOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(new Set(topics.map((topic) => topic.handle.trim()))).sort((a, b) =>
        a.localeCompare(b),
      ),
    ],
    [topics],
  );

  const topicFormHandleOptions = useMemo(() => {
    const scoped = initialHandleDirectory.filter((entry) =>
      topicForm.platform ? entry.platform === topicForm.platform : true,
    );

    return Array.from(new Set(scoped.map((entry) => entry.handle))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [initialHandleDirectory, topicForm.platform]);

  const filteredTopics = useMemo(() => {
    return topics.filter((topic) => {
      const platformMatches =
        platformFilter === "ALL" ? true : topic.platform.trim() === platformFilter;
      const handleMatches = handleFilter === "ALL" ? true : topic.handle.trim() === handleFilter;
      return platformMatches && handleMatches;
    });
  }, [handleFilter, platformFilter, topics]);

  async function refreshTopics() {
    const response = await fetch("/api/topics", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Failed to refresh topics.");
    }

    setTopics((await response.json()) as TopicRecord[]);
  }

  function handleTopicSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/topics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(topicForm),
        });

        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(result?.error || "Failed to create topic.");
        }

        setTopicForm({
          platform: "",
          handle: "",
          topic: "",
          notes: "",
        });
        await refreshTopics();
      } catch (topicError) {
        setError(topicError instanceof Error ? topicError.message : "Failed to create topic.");
      }
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-4 px-4 py-4 sm:px-6">
      <section className="rounded-[28px] border border-zinc-200 bg-white/95 px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Topic Planning
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
              Save topics by platform and handle
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Each topic row is uniquely constrained by platform, handle, and topic.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Back to posts
          </Link>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-[28px] border border-zinc-200 bg-white/95 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">New topic</h2>
          <form onSubmit={handleTopicSubmit} className="mt-4 space-y-3">
            <select
              value={topicForm.platform}
              onChange={(event) =>
                setTopicForm((current) => ({ ...current, platform: event.target.value }))
              }
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-950"
            >
              <option value="">Select platform</option>
              <option value="Instagram">Instagram</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="X">X</option>
            </select>

            <select
              value={topicForm.handle}
              onChange={(event) =>
                setTopicForm((current) => ({ ...current, handle: event.target.value }))
              }
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-950"
            >
              <option value="">Select handle</option>
              {topicFormHandleOptions.map((handle) => (
                <option key={handle} value={handle}>
                  {handle}
                </option>
              ))}
            </select>

            <input
              value={topicForm.topic}
              onChange={(event) =>
                setTopicForm((current) => ({ ...current, topic: event.target.value }))
              }
              placeholder="Topic to improve"
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
            />

            <textarea
              value={topicForm.notes}
              onChange={(event) =>
                setTopicForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Optional notes"
              className="min-h-28 w-full rounded-[24px] border border-zinc-300 px-4 py-4 text-sm outline-none focus:border-zinc-950"
            />

            <button
              type="submit"
              disabled={isPending}
              className="rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {isPending ? "Saving..." : "Save topic"}
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-zinc-200 bg-white/95 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">Topics table</h2>
              <p className="text-sm text-zinc-500">
                {filteredTopics.length} visible topic{filteredTopics.length === 1 ? "" : "s"}
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

          {filteredTopics.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">
              No topics match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-zinc-50 text-left text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Platform</th>
                    <th className="px-4 py-3 font-medium">Handle</th>
                    <th className="px-4 py-3 font-medium">Topic</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTopics.map((topic) => (
                    <tr key={topic.id} className="border-t border-zinc-200 align-top">
                      <td className="px-4 py-3 font-medium text-zinc-900">{topic.platform}</td>
                      <td className="px-4 py-3 text-zinc-700">{topic.handle}</td>
                      <td className="px-4 py-3 text-zinc-900">{topic.topic}</td>
                      <td className="px-4 py-3 text-zinc-600">{topic.notes || "-"}</td>
                      <td className="px-4 py-3 text-zinc-500">
                        {new Date(topic.updatedAt).toLocaleString()}
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
