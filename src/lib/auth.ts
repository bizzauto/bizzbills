import NextAuth, { type NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
  async authorize(credentials, req) {
    if (!credentials?.email || !credentials?.password) return null;

    const identifier = credentials.email.trim().toLowerCase();
    const rl = rateLimit({ key: `signin:${identifier}`, limit: 20 });
    if (!rl.allowed) return null;

    // Support both email and phone number login
    const isPhone = /^\d{10,15}$/.test(identifier.replace(/[\s\-+]/g, ""));
    const cleanPhone = identifier.replace(/[\s\-+]/g, "");

    const user = isPhone
      ? await prisma.user.findFirst({ where: { phone: cleanPhone } })
      : await prisma.user.findUnique({ where: { email: identifier } });

    if (!user || !user.passwordHash) return null;

    const isValid = await verifyPassword(credentials.password, user.passwordHash);
    if (!isValid) return null;

    let orgId: string | undefined;
    let role: string = "VIEWER";

    if (user.orgId) {
      orgId = user.orgId;
      role = user.role;
    }

    return {
      id: user.id,
      email: user.email ?? undefined,
      name: user.name,
      image: user.image,
      orgId,
      role,
    };
  },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.orgId = (user as { orgId?: string }).orgId;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { orgId?: string }).orgId = token.orgId as string | undefined;
        (session.user as { role?: string }).role = token.role as string | undefined;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
export { getServerSession };
export default handler;
