import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    username?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      username: string;
    };
  }
}
