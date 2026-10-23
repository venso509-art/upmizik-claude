// Ti repons vid pou tcheke si entènèt la tounen (OfflineNotification la rele l).
// Service worker la pa janm sere l, kidonk si l reponn, se vre rezo a ki mache.
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
