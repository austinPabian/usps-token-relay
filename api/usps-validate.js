export default async function handler(req, res) {
  // Grab USPS credentials from environment
  const clientId = process.env.USPS_CLIENT_ID;
  const clientSecret = process.env.USPS_CLIENT_SECRET;

  // Support GET or POST, pull from query or body
  const {
    address1,
    address2,
    city,
    state,
    zip5
  } = req.method === "POST" ? req.body : req.query;

  // Check for missing required params
  if (!address1 || !city || !state || !zip5) {
    return res.status(400).json({ error: "Missing required address fields" });
  }

  try {
    // Fetch token (optionally reuse if cached)
    const tokenResponse = await fetch("https://keyc.usps.com/oauth2/v3/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
      },
      body: "grant_type=client_credentials&scope=address-validation"
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(500).json({ error: "Failed to retrieve USPS token", detail: tokenData });
    }

    // Build validation request
    const validationResponse = await fetch("https://api.usps.com/shipping/v1/addresses/validate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        address: {
          address1,
          address2,
          city,
          state,
          zip5
        }
      })
    });

      const rawText = await validationResponse.text();
console.log("USPS raw response:", rawText);

let validationResult;
try {
  validationResult = JSON.parse(rawText);
} catch (err) {
  return res.status(500).json({ error: "USPS returned invalid JSON", detail: rawText });
}
      
    const validationResult = await validationResponse.json();

    if (!validationResponse.ok) {
      return res.status(validationResponse.status).json({
        error: "USPS validation failed",
        detail: validationResult
      });
    }

    return res.status(200).json(validationResult);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}