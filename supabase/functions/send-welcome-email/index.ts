import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// --- Add CORS headers to allow requests from your website ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // For production, replace '*' with your website's domain
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// The content of your welcome email
const emailSubject = "Welcome to Wyshdrop 🎁";
const instagramLink = "https://www.instagram.com/lydiaandcrim?igsh=MThiZDk0Y3F6anlzNg==";
const youtubeLink = "https://www.youtube.com/@LydiaAndCrim";

// This function generates the HTML content for the email
const generateEmailHtml = (username: string) => `
  <div style="font-family: sans-serif; line-height: 1.6;">
    <h2>Hi and Welcome ${username},</h2>
    <p>Thank you for signing up! Your support means a lot to our growing business, and we’re excited to have you with us.</p>
    <p>Our website is designed to help make gift-giving easier and more thoughtful. Whether you're discovering new products, finding gifts for friends, or sending a hint to someone special, we're here to make every step simple and personalized.</p>
    <p>If you have any questions, please reach out to us at <a href="mailto:lydiaandcrim@gmail.com">lydiaandcrim@gmail.com</a>.</p>
    <p>Stay connected with us on <a href="${instagramLink}">Instagram</a> and <a href="${youtubeLink}">YouTube</a>—we appreciate every follow and subscription!</p>
    <p>Warmly,<br>Lydia and Crim</p>
  </div>
`;

serve(async (req) => {
  // Handle preflight OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Extract the new user data from the request
    const { record: newUser } = await req.json();
    const userEmail = newUser.email;
    const username = newUser.raw_user_meta_data?.username || 'there';

    // 2. Get the SendGrid API key from your Supabase secrets
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    if (!sendgridApiKey) {
      throw new Error("SENDGRID_API_KEY is not set in Supabase secrets.");
    }

    // 3. Call the SendGrid API to send the email
    const sendgridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sendgridApiKey}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: userEmail }] }],
        from: { 
          email: "lydiaandcrim@gmail.com", 
          name: "WyshDrop" 
        },
        subject: emailSubject,
        content: [{ type: "text/html", value: generateEmailHtml(username) }],
      }),
    });

    // 4. Check if the email was sent successfully
    if (!sendgridResponse.ok) {
      const errorBody = await sendgridResponse.json();
      console.error("Failed to send welcome email via SendGrid:", errorBody);
      throw new Error(`SendGrid API error: ${JSON.stringify(errorBody)}`);
    }

    // 5. Return a success response
    return new Response(JSON.stringify({ message: "Welcome email sent successfully!" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    // Return an error response
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});