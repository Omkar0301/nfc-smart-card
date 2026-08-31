import { Role } from "@nfc-card/shared";
import type { NextFunction, Request, Response } from "express";
import { sendError } from "../lib/http.js";
import { userRepository } from "../repositories/user.repository.js";
import { verifyAccessToken } from "../services/token.service.js";

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = bearerToken(req);
  if (!token) {
    sendError(res, 401, "UNAUTHORIZED", "Authentication required.");
    return;
  }

  const verified = verifyAccessToken(token);
  if (!verified.ok) {
    const message =
      verified.code === "TOKEN_EXPIRED" ? "Access token expired." : "Invalid access token.";
    sendError(res, 401, verified.code, message);
    return;
  }

  const user = await userRepository.findByIdWithAuthFields(verified.userId);

  if (!user) {
    sendError(res, 401, "UNAUTHORIZED", "Invalid access token.");
    return;
  }

  if (user.status === "SUSPENDED") {
    sendError(res, 403, "ACCOUNT_SUSPENDED", "This account is suspended.");
    return;
  }

  req.user = { id: user.id, role: user.role as Role };
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (req.user?.role !== Role.ADMIN) {
      sendError(res, 403, "FORBIDDEN", "Admin access required.");
      return;
    }
    next();
  });
}
