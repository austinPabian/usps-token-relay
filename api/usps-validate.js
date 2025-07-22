export default async function handler(req, res) {
  const clientId = process.env.USPS_CLIENT_ID;
  const clientSecret = process.env.USPS_CLIENT_SECRET;

  // Extract query or body parameters
  const { address1, address2, city, state, zip5 } =
    req.method === "POST" ? req.body : req.query;

  // Basic validation
  if (!address1 || !city || !state || !zip5) {
    return res.status(400).json({ error: "Missing required address fields" });
  }

  try {
    // Get OAuth2 token
    const tokenRes = await fetch("https://keyc.usps.com/oauth2/v3/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: "grant_type=client_credentials&scope=address-validation",
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res
        .status(500)
        .json({ error: "Failed to retrieve USPS token", detail: tokenData });
    }

    // Construct address payload
    const addressPayload = {
      address1,
      ...(address2 && { address2 }),
      city,
      state,
      zip5,
    };

    // USPS Address Validation API (v3)
    const uspsRes = await fetch(
      "https://api.usps.com/addresses/v3/validate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: addressPayload }),
      }
    );

    // Grab text always, then try parsing as JSON
    const rawText = await uspsRes.text();
    console.log("USPS raw text:", rawText);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (err) {
      return res.status(500).json({
        error: "USPS returned non-JSON response",
        detail: rawText,
      });
    }

    if (!uspsRes.ok) {
      return res.status(uspsRes.status).json({
        error: "USPS validation failed",
        detail: data,
      });
    }

    // Return cleaned result
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}