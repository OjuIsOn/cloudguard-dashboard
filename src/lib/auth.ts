import jwt from "jsonwebtoken"
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (typeof payload === "object" && "id" in payload && "email" in payload) {
      return payload as { id: string; email: string };
    }

    return null;
  } catch (err) {
    console.error("JWT verification failed:", err);
    return null;
  }
}


// lib/auth.ts

export async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload; // or whatever you want from the token
  } catch (err) {
    console.error("JWT verification failed:", err);
    return null;
  }
}
