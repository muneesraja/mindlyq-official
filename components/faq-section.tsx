'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is MindlyQ?",
    answer:
      "MindlyQ is an intelligent WhatsApp bot that helps you manage reminders and organize your digital life using advanced AI technology. It works directly within WhatsApp, making it incredibly convenient to use.",
  },
  {
    question: "How do I get started with MindlyQ?",
    answer:
      "Getting started is simple! Just add our WhatsApp number to your contacts and send us a message. Our bot will guide you through the setup process and help you start setting reminders right away.",
  },
  {
    question: "Is MindlyQ free to use?",
    answer:
      "MindlyQ offers a free tier with basic features. For advanced features and increased usage, we offer affordable premium plans. Check out our pricing section for more details.",
  },
  {
    question: "How secure is my data with MindlyQ?",
    answer:
      "We take data security very seriously. All your data is encrypted and stored securely. We never share your personal information with third parties, and we comply with all relevant data protection regulations.",
  },
  {
    question: "Can I use MindlyQ for my business?",
    answer:
      "Yes! MindlyQ offers business plans with additional features like team collaboration, advanced analytics, and custom integrations. Contact us for more information about our business solutions.",
  },
  {
    question: "What types of reminders can I set?",
    answer:
      "You can set any type of reminder! From simple task reminders to recurring events, birthday reminders, and even context-aware reminders. Our AI understands natural language, so you can set reminders just like you'd tell a friend.",
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "You can cancel your subscription at any time through your account settings. If you need help, our support team is always available to assist you.",
  },
  {
    question: "What languages does MindlyQ support?",
    answer:
      "Currently, MindlyQ supports English, with plans to add more languages in the future. Stay tuned for updates!",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="container mx-auto px-4 py-20">
      <h2 className="text-3xl md:text-4xl font-bold text-primary text-center mb-4">
        Frequently Asked Questions
      </h2>
      <p className="text-lg text-gray-600 text-center mb-12">
        Got questions? We've got answers.
      </p>
      
      <div className="max-w-3xl mx-auto">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
