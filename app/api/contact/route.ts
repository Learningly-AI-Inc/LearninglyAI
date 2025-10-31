import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { sendContactEmail, sendContactConfirmation } from '@/lib/email-sender';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Validate input
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Save to database
    const supabase = await createClient();

    try {
      const { error: dbError } = await supabase
        .from('contact_submissions')
        .insert({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          message: message.trim(),
          submitted_at: new Date().toISOString()
        });

      if (dbError) {
        console.error('Error saving contact submission:', dbError);
        // Don't fail the request if DB insert fails
      }
    } catch (err) {
      console.error('Database error (table might not exist):', err);
      // Continue even if table doesn't exist
    }

    // Send email notification to contact@learningly.ai
    try {
      await sendContactEmail({ name, email, message });
      console.log('Contact email sent successfully');
    } catch (emailError) {
      console.error('Error sending contact email:', emailError);
      // Log the error but don't fail the request
    }

    // Send confirmation email to user (optional)
    try {
      await sendContactConfirmation(email, name);
      console.log('Confirmation email sent to user');
    } catch (confirmError) {
      console.error('Error sending confirmation email:', confirmError);
      // Don't fail the request if confirmation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your message! We\'ll get back to you soon.'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}
