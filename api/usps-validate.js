export default async function handler(req, res) {
  const clientId = process.env.USPS_CLIENT_ID;
  const clientSecret = process.env.USPS_CLIENT_SECRET;

  const { address1, address2, city, state, zip5 } =
    req.method === "POST" ? req.body : req.query;

  if (!address1 || !city || !state || !zip5) {
    return res.status(400).json({ error: "Missing required address fields" });
  }

  try {
    // Step 1: Get OAuth token
    const tokenResponse = await fetch("https://apis.usps.com/oauth2/v3/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "address-validation"
      }).toString()
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(500).json({
        error: "Failed to retrieve USPS token",
        detail: tokenData
      });
    }

    console.log("USPS Access Token:", accessToken);

    // Step 2: Prepare USPS payload
    const addressPayload = {
      address1,
      ...(address2 && { address2 }),
      city,
      state,
      zip5,
    };

    // Step 3: Validate address
    const validationResponse = await fetch("https://api.usps.com/addresses/v3/validate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ address: addressPayload })
    });

    const rawText = await validationResponse.text();
    console.log("USPS raw text response:", rawText);

    let parsedData;
    try {
      parsedData = JSON.parse(rawText);
    } catch (err) {
      return res.status(500).json({
        error: "USPS returned non-JSON response",
        detail: rawText.slice(0, 500)
      });
    }

    if (!validationResponse.ok) {
      return res.status(validationResponse.status).json({
        error: "USPS validation failed",
        detail: parsedData
      });
    }

    // Step 4: Return the validated address
    return res.status(200).json(parsedData);
  } catch (err) {
    return res.status(500).json({
      error: "Internal server error",
      detail: err.message
    });
  }
}