export default async function handler(req, res) {
  const { address1 = '', address2 = '', city, state, zip5 = '' } = req.body;

  const userId = process.env.USPS_USER_ID;

  const xmlRequest = `
    <AddressValidateRequest USERID="${userId}">
      <Revision>1</Revision>
      <Address ID="0">
        <Address1>${address1}</Address1>
        <Address2>${address2}</Address2>
        <City>${city}</City>
        <State>${state}</State>
        <Zip5>${zip5}</Zip5>
        <Zip4></Zip4>
      </Address>
    </AddressValidateRequest>
  `.trim();

  const url = `https://secure.shippingapis.com/ShippingAPI.dll?API=Verify&XML=${encodeURIComponent(xmlRequest)}`;

  try {
    const response = await fetch(url);
    const xmlText = await response.text();

    // Optional: parse XML to JSON
    // Example with `xml2js`:
    // const parsed = await xml2js.parseStringPromise(xmlText);
    // return res.status(200).json(parsed);

    res.status(200).send(xmlText); // or parse & return JSON
  } catch (error) {
    res.status(500).json({ error: 'USPS API failed', details: error.message });
  }
}