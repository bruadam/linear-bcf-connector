import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  // Optional: specify organization for Auth0 organization features
  ...(process.env.AUTH0_ORGANIZATION_ID && {
    authorizationParameters: {
      organization: process.env.AUTH0_ORGANIZATION_ID,
    },
  }),
});
