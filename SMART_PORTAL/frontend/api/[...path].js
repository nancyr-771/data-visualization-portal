function getBackendBaseUrl() {
  const raw = process.env.RAILWAY_BACKEND_URL || "";
  if (!raw) {
    throw new Error("RAILWAY_BACKEND_URL is not configured in Vercel.");
  }
  return raw.replace(/\/+$/, "");
}

function buildForwardHeaders(requestHeaders) {
  const headers = new Headers(requestHeaders);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("x-forwarded-host");
  headers.delete("x-forwarded-port");
  headers.delete("x-forwarded-proto");
  return headers;
}

async function forwardRequest(request) {
  try {
    const incomingUrl = new URL(request.url);
    const backendBaseUrl = getBackendBaseUrl();
    const upstreamUrl = `${backendBaseUrl}${incomingUrl.pathname.replace(/^\/api/, "")}${incomingUrl.search}`;
    const method = request.method.toUpperCase();
    const canHaveBody = method !== "GET" && method !== "HEAD";

    const upstreamResponse = await fetch(upstreamUrl, {
      method,
      headers: buildForwardHeaders(request.headers),
      body: canHaveBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.set("cache-control", "no-store");

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return Response.json(
      {
        error: "API proxy request failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}

export async function GET(request) {
  return forwardRequest(request);
}

export async function POST(request) {
  return forwardRequest(request);
}

export async function PUT(request) {
  return forwardRequest(request);
}

export async function PATCH(request) {
  return forwardRequest(request);
}

export async function DELETE(request) {
  return forwardRequest(request);
}

export async function OPTIONS(request) {
  return forwardRequest(request);
}
