import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "schoolbridge",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
