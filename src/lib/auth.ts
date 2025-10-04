import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    tenant?: string
  }

  interface User {
    id?: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token
        token.id = profile.sub
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        // 型アサーションを使用してidプロパティを追加
        (session.user as { id?: string }).id = token.id as string
        session.accessToken = token.accessToken as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // 代理店ページからのリダイレクトの場合は代理店ページに戻る
      if (url.startsWith('/') && url !== '/') {
        return `${baseUrl}${url}`
      }
      // 外部URLの場合はそのまま
      if (url.startsWith('http')) {
        return url
      }
      // デフォルトはベースURL
      return baseUrl
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
