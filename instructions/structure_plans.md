
## 1. Only brainstorming (Think deeply, no hurries)
In our current implementation, we have a single extra instruction provided to Gemini LLM to get and parse the reminder description and set it as a reminder. But in future our LLM should be able to other things like collecting user's name, Timezone, Memorization, Handling regular friendly chat, etc. In order to achive this, we can have a RAG/Agentic model where we store the reminders in the DB and use the RAG model to retrieve the reminders for the user. We are going to think about which should be the best approach in our case to scale our App. Our future feature are:
 - Integrating Google Calendar
 - Integrating Google Tasks
 - Integrating Google Keep
 - Integrating Google Drive
 - Integrating Google Photos
 - Integrating Google Sheets
 - Ability to remember and retrive back the information that user needs
   * Let's say user saved their reminder "Remind me to call mom tomorrow at 6pm"
   * Then our LLM should be able to retrieve this reminder when the user asks "What's my reminder for tomorrow?".
   * Let's say user send an image which is stored in Google drive and user needs to retrieve this image based on the tag or title provided to the image by the user, if the user didn't provide any information after sharing it our LLM should force the user to enter some title or tags to retrieve the image.
   * Then our LLM should be able to retrieve this image when the user asks "What's the image I sent you?"
 - Set remainder for other users based on their timezone

## 2. Implementing the RAG/Agentic model
