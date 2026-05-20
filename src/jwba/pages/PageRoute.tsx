import { useParams } from "react-router-dom";
import { PageView } from "../PageView";

export default function PageRoute() {
  const { id } = useParams();
  if (!id) return null;
  return <PageView pageId={id} />;
}