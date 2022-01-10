import NextAuth from "next-auth"
import SpotifyProvider from "next-auth/providers/spotify"
import { refreshAccessToken } from "spotify-web-api-node/src/server-methods"
import spotifyApi, { LOGIN_URL } from "../../../lib/spotify"


async function RefreshAccessToken(token) {
  try {

    spotifyApi.setAccessToken(token.accessToken);
    spotifyApi.setRefreshToken(token.refreshToken);

    const { body: refreshedToken } = await spotifyApi.refreshAccessToken();
    console.log('REFRESHED TOKEN IS', refreshedToken);

    return {
      ...token,
      accessToken: refreshedToken.accessToken,
      accessTokenExpires: Date.now +refreshedToken.expires_in * 1000, // 1 hour, 3600 from spotify API
      refreshToken: refreshedToken.refresh_token ?? token.refreshToken,
    }

  } catch (err) {
    console.log(error);

    return {
      ...token,
      error: 'RefreshAccessTokenError'
    }
  }
}

export default NextAuth({
  // Configure one or more authentication providers
  providers: [
    SpotifyProvider({
      clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
      clientSecret: process.env.NEXT_PUBLIC_CLIENT_SECRET,
      authorization: LOGIN_URL,
    }),
    // ...add more providers here
  ],
  secret: process.env.JWT_SECRET,
  pages: {
    signIn: '/login'
  },
  callbacks: {
    async jwt({ token, account, user }){
      //intial
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          username: account.providerAccountId,
          accessTokenExpires: account.expires_at * 1000, // in milliseconds
        }
      }

      //return previous token if not expired
      if (Date.now() < token.accessTokenExpires) {
        console.log('EXISTING TOKEN IS VALID');
        return token;
      }

      // expired token
      console.log('TOKEN HAS EXPIRED, REFRESHING');
      return await refreshAccessToken(token);

    },

    async session({ session, token }) {
      session.user.accessToken = token.accessToken;
      session.user.refreshToken = token.refreshToken;
      session.user.username = token.username;

      return session;
    }
  },
})