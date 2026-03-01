import { pollClassDojo } from "./poll-classdojo";
import { extractEvents } from "./extract-events";
import { requestApproval } from "./request-approval";
import { syncEvents } from "./sync-events";
import { downloadPhotos } from "./download-photos";
import { processPdf } from "./process-pdf";

/** All Inngest functions — pass to serve() in the API route */
export const allFunctions = [
  pollClassDojo,
  extractEvents,
  requestApproval,
  syncEvents,
  downloadPhotos,
  processPdf,
];
