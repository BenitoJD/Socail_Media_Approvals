import { Dashboard } from "@/components/dashboard";
import { getPosts, serializePost } from "@/lib/posts";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Promise<{ post?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const posts = await getPosts();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const postParam = resolvedSearchParams?.post;
  const initialSelectedPostId =
    postParam && /^\d+$/.test(postParam) ? Number(postParam) : null;

  return (
    <Dashboard
      initialPosts={posts.map(serializePost)}
      initialSelectedPostId={initialSelectedPostId}
    />
  );
}
