import { pollClassDojo } from "./poll-classdojo";
import { extractEvents } from "./extract-events";
import { requestApproval } from "./request-approval";
import { syncEvents } from "./sync-events";
import { downloadPhotos } from "./download-photos";

/** All Inngest functions — pass to serve() in the API route */
export const allFunctions = [
  pollClassDojo,
  extractEvents,
  requestApproval,
  syncEvents,
  downloadPhotos,
];
