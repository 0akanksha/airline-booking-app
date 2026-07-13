import jwt from "jsonwebtoken";
import type { Response } from "express";

export interface AuthPayload {
  id: string;
  role: string;
}

export function signToken(user: { id: string; role: string }): string {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: "7d" });
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie("auth_token");
}
