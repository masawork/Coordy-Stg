import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'coordyStorage',
  access: (allow) => ({
    'identity-documents/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
    'public/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
});
