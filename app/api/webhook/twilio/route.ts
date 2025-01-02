import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { OpenAI } from 'openai';
import { supabase } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(req: Request) {
  try {
    // Log incoming request
    console.log('Received Twilio webhook request');
    
    const formData = await req.formData();
    const message = formData.get('Body')?.toString() || '';
    const from = (formData.get('From')?.toString() || '').replace('whatsapp:', '');
    
    console.log('Message received:', { from, message });

    if (!message || !from) {
      console.error('Missing required fields:', { message, from });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Process the message with OpenAI
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are MindlyQ, a WhatsApp bot that helps users manage reminders and organize content. 
          Parse the user's message and determine if it's:
          1. A reminder request (e.g., "Remind me to call John tomorrow at 2pm")
          2. Content to be saved (e.g., "Save this article: https://example.com")
          3. A category management request (e.g., "Create category Work")
          4. A general query (e.g., "Help", "What can you do?")
          
          Respond with a JSON object containing:
          {
            "type": "reminder|content|category|query",
            "title": "string",
            "description": "string",
            "due_date": "ISO string", // for reminders
            "contentType": "string", // for content
            "content": "string" // for content
          }`,
        },
        { role: 'user', content: message },
      ],
      model: 'gpt-3.5-turbo',
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('AI Response:', aiResponse);
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse || '{}');
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      parsedResponse = { 
        type: 'error', 
        message: 'I had trouble understanding that. Could you please rephrase?' 
      };
    }

    // Handle different types of requests
    let responseMessage = '';
    
    switch (parsedResponse.type) {
      case 'reminder':
        // Save reminder to database
        const { data: reminder, error: reminderError } = await supabase
          .from('reminders')
          .insert({
            title: parsedResponse.title,
            description: parsedResponse.description,
            due_date: parsedResponse.due_date,
            user_id: from,
            status: 'active'
          })
          .select()
          .single();

        if (reminderError) {
          console.error('Failed to save reminder:', reminderError);
          responseMessage = 'Sorry, I could not save your reminder. Please try again.';
        } else {
          responseMessage = `✅ Reminder set: "${parsedResponse.title}" for ${new Date(parsedResponse.due_date).toLocaleString()}`;
        }
        break;

      case 'content':
        // Save content to database
        const { data: content, error: contentError } = await supabase
          .from('content_items')
          .insert({
            type: parsedResponse.contentType,
            content: parsedResponse.content,
            user_id: from,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (contentError) {
          console.error('Failed to save content:', contentError);
          responseMessage = 'Sorry, I could not save your content. Please try again.';
        } else {
          responseMessage = '✅ Content saved successfully! Would you like to categorize it?';
        }
        break;

      case 'query':
        responseMessage = `Hello! I'm MindlyQ, your personal WhatsApp assistant. I can help you with:
1. Setting reminders (e.g., "Remind me to call John tomorrow at 2pm")
2. Saving content (e.g., "Save this article: https://example.com")
3. Managing categories (e.g., "Create category Work")

How can I help you today?`;
        break;

      default:
        responseMessage = 'I\'m not sure how to help with that. Try asking me to set a reminder or save some content!';
    }

    console.log('Sending response:', responseMessage);

    // Send response back to WhatsApp
    await twilioClient.messages.create({
      body: responseMessage,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `whatsapp:${from}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}