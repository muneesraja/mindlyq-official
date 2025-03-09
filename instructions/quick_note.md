Plan of action:

1. Fix the Untitled issue for remainder creation agent and modification agent, currently the remainder description is creation is fine, but most of the time the remainder title is "Untitled reminder". Our agent should always make meaningful naming for the title.
example: 
This is current implementation storing title:
- 🔄 "Untitled reminder" - Mar 9 12:10 PM
   Time to cook the mid-brunch! Enjoy!
- 🔄 "Untitled reminder" - Mar 9 12:12 PM
   Time to cook the mid-brunch! Get cooking!
What we wanted is:
- 🔄 "Cook mid-brunch" - Mar 9 12:10 PM
   Time to cook the mid-brunch! Enjoy!
- 🔄 "Cook mid-brunch" - Mar 9 12:12 PM
   Time to cook the mid-brunch! Get cooking!

2. Make the modification agent smart, similar to creation agent.

3. Create a response agent which will handle the response from LLM and return a proper response to the user, based on the response type. It should be similar to intent detection agent which handles the response from LLM and returns a proper response to the user.

4. Multiple remainder creation agent which creates remainder is bulk, for 
example:
- set standup meeting remainder on following date 10 AM: 10th, 12th and 14th.
- set two reminders that I'm starting to chennai by tomorrow 6 PM and my return flight is at 11 PM 15th of March

4. Fix the listing agent, currently the listing agent is throwing error for listing only recurring remainders. We need to analyse the schema of remainders and provide clear context/instruction to listing agent, so that this error could be avoided in the future.

Prompt provided by user:
list only non recurring remainders

Error:

Error in reminder listing: PrismaClientValidationError: 
Invalid `prisma.reminder.findMany()` invocation:

{
  where: {
    user_id: "+918778604904",
    recurring: false,
    ~~~~~~~~~
    status: "active",
?   AND?: ReminderWhereInput | ReminderWhereInput[],
?   OR?: ReminderWhereInput[],
?   NOT?: ReminderWhereInput | ReminderWhereInput[],
?   id?: StringFilter | String,
?   title?: StringFilter | String,
?   description?: StringNullableFilter | String | Null,
?   due_date?: DateTimeFilter | DateTime,
?   recurrence_type?: StringNullableFilter | String | Null,
?   recurrence_days?: IntNullableListFilter,
?   recurrence_time?: IntNullableFilter | Int | Null,
?   last_sent?: DateTimeNullableFilter | DateTime | Null,
?   created_at?: DateTimeFilter | DateTime,
?   updated_at?: DateTimeFilter | DateTime
  },
  orderBy: [],
  take: 10,
  skip: 0
}

Unknown argument `recurring`. Available options are marked with ?.
    at wn (/Users/muneesraja/Desktop/Projects/MindlyQ/mindlyq-final/node_modules/@prisma/client/runtime/library.js:29:1363)
    at Vn.handleRequestError (/Users/muneesraja/Desktop/Projects/MindlyQ/mindlyq-final/node_modules/@prisma/client/runtime/library.js:121:6982)
    at Vn.handleAndLogRequestError (/Users/muneesraja/Desktop/Projects/MindlyQ/mindlyq-final/node_modules/@prisma/client/runtime/library.js:121:6663)
    at Vn.request (/Users/muneesraja/Desktop/Projects/MindlyQ/mindlyq-final/node_modules/@prisma/client/runtime/library.js:121:6370)
    at async l (/Users/muneesraja/Desktop/Projects/MindlyQ/mindlyq-final/node_modules/@prisma/client/runtime/library.js:130:9617)
    at async ReminderListingAgent.process (webpack-internal:///(rsc)/./lib/agents/reminder-listing-agent.ts:91:31)
    at async AgentManager.processMessage (webpack-internal:///(rsc)/./lib/agents/agent-manager.ts:69:37)
    at async POST (webpack-internal:///(rsc)/./app/api/webhook/route.ts:44:22)
    at async /Users/muneesraja/Desktop/Projects/MindlyQ/mindlyq-final/node_modules/next/dist/compiled/next-server/app-route.runtime.dev.js:1:66877 {
  clientVersion: '6.2.1'
}
Agent manager result: {
  "success": false,
  "message": "An error occurred while retrieving your reminders."
}