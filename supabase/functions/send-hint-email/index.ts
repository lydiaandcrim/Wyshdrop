// supabase/functions/send-hint-email/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0'; // Use the latest Supabase JS client

// IMPORTANT: Replace with your actual email sending logic and API keys
// These should be stored as Supabase Secrets (e.g., SENDGRID_API_KEY, RESEND_API_KEY)
// and accessed via Deno.env.get()
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY'); // Example for Resend

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { product, recipients, sender } = await req.json();

    if (!product || !recipients || !Array.isArray(recipients) || recipients.length === 0 || !sender) {
      return new Response(JSON.stringify({ error: 'Missing required data: product, recipients, or sender' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client for potential database updates (e.g., updating hint status)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false },
      }
    );

    // --- Email Sending Logic (Example using Resend) ---
    // You would replace this with your chosen email service's API call
    const emailPromises = recipients.map(async (recipient) => {
      const emailSubject = `A Hint from ${sender.username} on WyshDrop: Check out "${product.name}"!`;
      const emailBody = `
        <p>Hi ${recipient.contact_name || 'there'},</p>
        <p>Your friend ${sender.username} (${sender.email}) thought you might be interested in this product on WyshDrop:</p>
        <h2>${product.name}</h2>
        <p>${product.description}</p>
        <p>Price: $${product.price}</p>
        <p><a href="${product.amazon_link || '#'}" style="background-color: #9A6E45; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Product on Amazon</a></p>
        <p>Or view it on WyshDrop: <a href="${Deno.env.get('APP_URL')}/product/${product.id}">${product.name}</a></p>
        <p>Happy Gifting!</p>
        <p>The WyshDrop Team</p>
      `;

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'WyshDrop <onboarding@resend.dev>', // Replace with your verified Resend sender email
            to: recipient.contact_email,
            subject: emailSubject,
            html: emailBody,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          console.error(`Resend API error for ${recipient.contact_email}:`, data);
          return { success: false, email: recipient.contact_email, error: data };
        }
        console.log(`Email sent to ${recipient.contact_email}:`, data);
        return { success: true, email: recipient.contact_email, data: data };
      } catch (emailError) {
        console.error(`Error sending email to ${recipient.contact_email}:`, emailError);
        return { success: false, email: recipient.contact_email, error: emailError.message };
      }
    });

    const emailResults = await Promise.all(emailPromises);

    // You might want to update the 'sent_hints' table here based on emailResults
    // For example, marking successful sends as 'sent' and failures as 'failed'.
    // This would require passing the hint_id from the client to the edge function.

    return new Response(JSON.stringify({ message: 'Hint email processing initiated', results: emailResults }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
