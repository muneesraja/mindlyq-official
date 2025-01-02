import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.1';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('PROJECT_URL')!;
const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!;

console.log('Initializing with URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  recurrence_type: 'none' | 'daily' | 'weekly' | 'monthly';
  recurrence_days?: number[];
  recurrence_time?: string;
}

async function sendWhatsAppMessage(to: string, message: string) {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')!;

  console.log('Sending WhatsApp message to:', to);
  
  const url = `https://api.twilio.com/2010-04/Accounts/${twilioAccountSid}/Messages.json`;
  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

  const formData = new URLSearchParams();
  formData.append('To', `whatsapp:${to}`);
  formData.append('From', `whatsapp:${twilioPhoneNumber}`);
  formData.append('Body', message);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('Twilio API error:', responseData);
      throw new Error(`Failed to send WhatsApp message: ${response.statusText}`);
    }

    console.log('WhatsApp message sent successfully:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  try {
    console.log('Check-reminders function triggered');
    
    // Get current time
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    console.log('Checking reminders between:', {
      from: fiveMinutesAgo.toISOString(),
      to: fiveMinutesFromNow.toISOString()
    });

    // Query for due reminders
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('status', 'active')
      .gte('due_date', fiveMinutesAgo.toISOString())
      .lte('due_date', fiveMinutesFromNow.toISOString());

    if (error) {
      console.error('Database query error:', error);
      throw error;
    }

    console.log(`Found ${reminders?.length || 0} reminders to process`);
    if (reminders?.length) {
      console.log('Reminders:', reminders);
    }

    // Process each reminder
    for (const reminder of reminders || []) {
      try {
        console.log('Processing reminder:', {
          id: reminder.id,
          title: reminder.title,
          due_date: reminder.due_date
        });

        // Send WhatsApp message
        await sendWhatsAppMessage(
          reminder.user_id,
          `🔔 Reminder: ${reminder.title}\n${reminder.description}`
        );

        // Update reminder status based on recurrence
        if (reminder.recurrence_type === 'none') {
          console.log('Marking one-time reminder as completed:', reminder.id);
          // Mark one-time reminder as completed
          const { error: updateError } = await supabase
            .from('reminders')
            .update({ status: 'completed' })
            .eq('id', reminder.id);

          if (updateError) {
            console.error('Error updating reminder status:', updateError);
            throw updateError;
          }
        } else {
          // Calculate next occurrence for recurring reminders
          let nextDueDate = new Date(reminder.due_date);
          switch (reminder.recurrence_type) {
            case 'daily':
              nextDueDate.setDate(nextDueDate.getDate() + 1);
              break;
            case 'weekly':
              nextDueDate.setDate(nextDueDate.getDate() + 7);
              break;
            case 'monthly':
              nextDueDate.setMonth(nextDueDate.getMonth() + 1);
              break;
          }
          
          console.log('Updating recurring reminder:', {
            id: reminder.id,
            nextDueDate: nextDueDate.toISOString()
          });

          // Update the reminder with next due date
          const { error: updateError } = await supabase
            .from('reminders')
            .update({ due_date: nextDueDate.toISOString() })
            .eq('id', reminder.id);

          if (updateError) {
            console.error('Error updating reminder due date:', updateError);
            throw updateError;
          }
        }

        console.log(`Successfully processed reminder: ${reminder.id}`);
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: reminders?.length || 0 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-reminders function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
