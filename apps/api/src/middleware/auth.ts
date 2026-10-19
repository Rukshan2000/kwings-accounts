import crypto from 'node:crypto';
import type { RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { db } from '../db';
import { HttpError } from './errors';

export const AUTH_COOKIE = 'ka_token';
export const CSRF_COOKIE = 'ka_csrf';
const SESSION_HOURS = 12;

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

export function startSession(res: Response, userId: string) {
  const maxAge = SESSION_HOURS * 3600 * 1000;
  const token = jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: `${SESSION_HOURS}h` });
  const base = { secure: config.cookieSecure, sameSite: 'strict' as const, path: '/', maxAge };
  res.cookie(AUTH_COOKIE, token, { ...base, httpOnly: true });
  // Double-submit CSRF token: readable by the frontend, echoed back in the X-CSRF-Token header.
  res.cookie(CSRF_COOKIE, crypto.randomBytes(24).toString('hex'), { ...base, httpOnly: false });
}

export function endSession(res: Response) {
  res.clearCookie(AUTH_COOKIE, { path: '/' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) throw new HttpError(401, 'Not authenticated');
  let sub: string;
  try {
    sub = String((jwt.verify(token, config.jwtSecret) as jwt.JwtPayload).sub);
  } catch {
    throw new HttpError(401, 'Session expired');
  }
  const user = await db('users').where({ id: sub }).first('id');
  if (!user) throw new HttpError(401, 'Not authenticated');
  req.userId = user.id;
  next();
};

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const requireCsrf: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.get('x-csrf-token');
  if (
    !cookie ||
    !header ||
    cookie.length !== header.length ||
    !crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header))
  ) {
    throw new HttpError(403, 'Invalid CSRF token');
  }
  next();
};

// ponytail: in-memory per-IP limiter, fine for one API container; move to a shared store if the API is scaled out.
export function rateLimit(max: number, windowMs: number): RequestHandler {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip ?? 'unknown';
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
      return next();
    }
    if (++entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.reset - now) / 1000));
      throw new HttpError(429, 'Too many login attempts. Try again later.');
    }
    next();
  };
}
