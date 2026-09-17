import iconUrl from "$lib/assets/favicon.ico?url";

export async function GET({ fetch }) {
  const response = await fetch(iconUrl);

  if (!response.ok) {
    return new Response("Favicon not found", { status: 404 });
  }

  return new Response(await response.arrayBuffer(), {
    headers: {
      "Content-Type": "image/x-icon",
      "Cache-Control": "public, max-age=86400",
    },
  });
}