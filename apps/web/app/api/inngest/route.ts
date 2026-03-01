import { serve } from "inngest/next";
import { inngest, allFunctions } from "@schoolbridge/jobs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: allFunctions,
});
