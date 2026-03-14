// src/types/express.d.ts

declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
      roles: string[];
      permissions: string[];
    };
  }
}