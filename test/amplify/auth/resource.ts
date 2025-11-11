import { defineAuth } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: { email: true },
  userAttributes: {
    "custom:userType": { dataType: "String", mutable: true },
    "custom:role": { dataType: "String", mutable: true },
  },
  groups: ["CLIENTS", "CREATORS", "ADMINS"],
});
