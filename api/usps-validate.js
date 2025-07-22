module.exports = async function handler(req, res) {
  const clientId = process.env.USPS_CLIENT_ID;
  const clientSecret = process.env.USPS_CLIENT_SECRET;

  const {
    address1,
    address2,
    city,
    state,
    zip5
  } = req.method === "POST" ? req.body : req.query;

  if (!address1 || !city || !state || !zip5) {
    return res.status(400).json({ error: "Missing required address fields" });
  }

  try {
    // Get OAuth token
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

      console.log("USPS Access Token:", accessToken);
console.log("USPS Payload:", JSON.stringify({
  address: Object.fromEntries(
    Object.entries({ address1, address2, city, state, zip5 })
      .filter(([_, v]) => v !== undefined && v !== "")
  )
}));
      
    // USPS address validation call
    const validationResponse = await fetch("https://api.usps.com/shipping/v1/addresses/validate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        address: Object.fromEntries(
  Object.entries({ address1, address2, city, state, zip5 })
    .filter(([_, v]) => v !== undefined && v !== "")
)
      })
    });

const rawText = await validationResponse.text();
console.log("USPS Raw Response:", rawText);
let validationResult;

try {
  validationResult = JSON.parse(rawText);
} catch (e) {
  return res.status(500).json({
    error: "Failed to parse USPS response",
    detail: rawText
  });
}
      
    const rawText = await validationResponse.text();
    let validationResult;

    try {
      validationResult = JSON.parse(rawText);
    } catch (jsonErr) {
      return res.status(500).json({
        error: "USPS returned invalid JSON",
        detail: rawText
      });
    }

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
};
