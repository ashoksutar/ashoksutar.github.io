export async function onRequestPost(context) {
  const { request, env } = context;

  const SECRET_KEY = "0x4AAAAAADK62B-7zesZ35eW6G9_1yL0sCw";

  try {
    const body = await request.json();
    const token = body.token;

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Missing token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ip = request.headers.get("CF-Connecting-IP") || "";

    const formData = new FormData();
    formData.append("secret", SECRET_KEY);
    formData.append("response", token);
    formData.append("remoteip", ip);

    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: formData }
    );

    const result = await verifyResponse.json();

    if (result.success) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `cf_verified=1; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`,
        },
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: result["error-codes"] }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
