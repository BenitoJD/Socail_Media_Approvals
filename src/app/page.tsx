import { Dashboard } from "@/components/dashboard";
import { getPosts, serializePost } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function Home() {
  const posts = await getPosts();

  return <Dashboard initialPosts={posts.map(serializePost)} />;
}
