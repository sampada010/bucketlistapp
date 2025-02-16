import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "amplifyBucketTrackerImages",
  access: (allow) => ({
    "media/{identity_id}/*": [
      allow.entity("identity").to(["read", "write", "delete"]),
    ],
  }),
});
