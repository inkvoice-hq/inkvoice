// Kept so old links and manual tests keep working: runs the full daily job.
import { GET as daily } from "../daily/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  return daily(req);
}
