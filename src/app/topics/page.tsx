import { TopicsPage } from "@/components/topics-page";
import { getTopics, serializeTopic } from "@/lib/topics";

export const dynamic = "force-dynamic";

export default async function TopicsRoute() {
  const topics = await getTopics();

  return <TopicsPage initialTopics={topics.map(serializeTopic)} />;
}
