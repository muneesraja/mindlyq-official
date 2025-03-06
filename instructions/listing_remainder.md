No code changes required, I want our Ai to interact with the DB instead of hardcoding things manually. what are different ways to implement our goal? - I think we can provide some query as a tool to our Ai - Jus my opinion.
For example:
If we hardcode some values like sort order to asc and desc, it is limited to that, but if we give freedom we don't need to constantly maintain things manually.

Scenarios may vary:
1. Can you sort it by date but in reverse, which means new remainders first?
2. Next page
3. sort by oldest date first
4. sort by latest date first
5. list remainder before 5:30 PM
6. Show remainders without tips
7. Show my remainders in a JSON format
8. Show my last two completed remainders
9. Tell my first remainder I set on this platform
10. My upcoming upcoming two remainders
11. what is the next remainder?
12. Are there any remaiders tomorrow?
etc..

Note:
status  in DB: deleted, sent, active
ex. when a user asks "Show my last completed reminders", it should fetch sent reminders only. Basically sent means completed here.
recurrence_type in DB: none, daily, weekly


