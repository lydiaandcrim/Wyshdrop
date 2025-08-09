import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// --- THIS IS THE FIX: Add CORS headers to allow requests from your website ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // For production, replace '*' with your website's domain, e.g., 'https://wyshdrop.com'
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function generates the HTML content for the hint email
const generateHintEmailHtml = (senderName: string, product: any) => `
  <div style="font-family: sans-serif; line-height: 1.6; text-align: center; border: 1px solid #eee; padding: 20px;">
    <h2 style="color: #333;">You've Received a Hint!</h2>
    <p style="color: #555;">Your friend, <strong>${senderName}</strong>, thought you might like this:</p>
    <div style="margin: 20px 0;">
      <a href="${product.amazon_link || '#'}" target="_blank">
        <img src="${product.image_url}" alt="${product.name}" style="max-width: 300px; border-radius: 8px; border: 1px solid #ddd;">
      </a>
    </div>
    <h3 style="margin: 10px 0;">${product.name}</h3>
    <p style="font-size: 1.2em; font-weight: bold; color: #000;">$${product.price}</p>
    <p style="color: #777; font-style: italic;">"${product.description}"</p>
    <a href="${product.amazon_link || '#'}" target="_blank" style="display: inline-block; background-color: #9A6E45; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px;">
      Check it out on WyshDrop
    </a>
    <p style="font-size: 0.8em; color: #aaa; margin-top: 20px;">This hint was sent from WyshDrop.</p>
  </div>
`;

serve(async (req) => {
  // --- THIS IS THE FIX: Handle preflight OPTIONS request for CORS ---
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Extract the product and recipient data from the request body
    const { product, recipients, sender } = await req.json();

    if (!product || !recipients || !sender) {
      throw new Error("Missing product, recipients, or sender information.");
    }

    // 2. Get the SendGrid API key securely from your Supabase secrets.
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    if (!sendgridApiKey) {
      throw new Error("SENDGRID_API_KEY is not set in Supabase secrets.");
    }

    // 3. Loop through each recipient and send an email
    for (const recipient of recipients) {
      const emailHtml = generateHintEmailHtml(sender.username, product);
      
      const sendgridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sendgridApiKey}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: recipient.contact_email }] }],
          from: { 
            email: "lydiaandcrim@gmail.com", 
            name: `${sender.username} via WyshDrop` 
          },
          subject: `🎁 A gift hint from ${sender.username}!`,
          content: [{ type: "text/html", value: emailHtml }],
        }),
      });

      if (!sendgridResponse.ok) {
        const errorBody = await sendgridResponse.json();
        console.error(`Failed to send hint email to ${recipient.contact_email}:`, errorBody);
      }
    }

    // 4. Return a success response with CORS headers
    return new Response(JSON.stringify({ message: "Hint emails processed successfully!" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    // Return an error response with CORS headers
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
