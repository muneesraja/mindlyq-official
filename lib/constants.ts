export const API_ROUTES = {
  WEBHOOK: {
    TWILIO: "/api/webhook",
  },
} as const;

export function getWebhookUrl(path: string): string {
  return `${process.env.API_URL}${path}`;
}
