export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const client_id = process.env.USPS_CLIENT_ID;
  const client_secret = process.env.USPS_CLIENT_SECRET;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id,
    client_secret,
  });

  try {
    const tokenRes = await fetch("https://api.usps.com/oauth2/v3/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      return res.status(tokenRes.status).json(tokenData);
    }

    return res.status(200).json({ access_token: tokenData.access_token });
  } catch (err) {
    return res.status(500).json({ error: "Token request failed", detail: err.message });
  }
}