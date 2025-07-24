// This is your Supabase Edge Function.
// Save this file as `supabase/functions/send-welcome-email/index.ts`
// Make sure you have set up your secrets (environment variables) in Supabase!

// Import necessary libraries for Deno (Supabase Edge Functions use Deno)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

// This function will be called by Supabase when a new user is created.
serve(async (req) => {
  try {
    // Get the new user's information from the request body (sent by the database trigger)
    const { record } = await req.json();

    // Create a Supabase client with admin privileges to fetch profile data securely
    // We use the Service Role Key here because this code runs on the server (Edge Function)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', // Get Supabase URL from secrets
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Get Supabase Service Role Key from secrets
    );

    const userId = record.id;
    const userEmail = record.email;
    // Try to get username from the user's metadata (especially for social logins)
    // or default to a part of their email if no username is found yet.
    let username = record.user_metadata?.username || record.user_metadata?.full_name || userEmail.split('@')[0];

    // Attempt to fetch the username from your 'profiles' table.
    // This is important because your React app saves the username there.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();

    // If a profile is found and it has a username, use that.
    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means "no row found", which is okay if profile isn't instantly there
      console.error('Error fetching profile for username in welcome email function:', profileError);
    } else if (profile && profile.username) {
      username = profile.username;
    }

    // Define the email content
    const subject = 'Welcome to Wyshdrop 🎁';
    const body = `
      Hi and Welcome ${username},

      Thank you for signing up! Your support means a lot to our growing business, and we’re excited to have you with us.

      Our website is designed to help make gift-giving easier and more thoughtful. Whether you're discovering new products, finding gifts for friends, or sending a hint to someone special, we're here to make every step simple and personalized.

      If you have any questions, please reach out to us at lydiaandcrim@gmail.com. Stay connected with us on Instagram [our instagram page] and YouTube [0ur YouTube channel]—we appreciate every follow and subscription!

      Warmly,
      The Wyshdrop Team
    `;

    // Get your email service URL, API Key, and Sender Email from Supabase Secrets
    const emailServiceUrl = Deno.env.get('EMAIL_SERVICE_URL');
    const emailServiceApiKey = Deno.env.get('EMAIL_SERVICE_API_KEY');
    const senderEmail = Deno.env.get('SENDER_EMAIL');

    // Basic check to make sure secrets are set
    if (!emailServiceUrl || !emailServiceApiKey || !senderEmail) {
      console.error('Email service secrets are not configured. Cannot send welcome email.');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Prepare the data payload for your email service API
    // This format might vary slightly depending on your chosen email service (Resend, SendGrid, Mailgun)
    // Check your email service's documentation for the exact payload format.
    const emailPayload = {
      to: userEmail,
      from: senderEmail,
      subject: subject,
      text: body, // Use 'text' for plain text email. For HTML, you'd use 'html' property.
      // Example for Resend:
      // html: `<p>Hi and Welcome <strong>${username}</strong>,</p>...`
    };

    // Send the email using a fetch request to your email service
    const emailResponse = await fetch(emailServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${emailServiceApiKey}`, // Most services use Bearer token
        // For Mailgun, it might be 'Authorization': `Basic ${btoa(`api:${emailServiceApiKey}`)}`
      },
      body: JSON.stringify(emailPayload),
    });

    // Check if the email was sent successfully
    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error(`Failed to send welcome email: ${emailResponse.status} ${emailResponse.statusText} - ${errorText}`);
      return new Response(JSON.stringify({ error: 'Failed to send welcome email' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log(`Welcome email successfully sent to ${userEmail}`);
    return new Response(JSON.stringify({ message: 'Welcome email sent successfully' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in Supabase Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
