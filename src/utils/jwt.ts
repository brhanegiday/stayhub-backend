import jwt from "jsonwebtoken";
import crypto from "crypto";

export interface TokenPayload {
    userId: string;
    email: string;
    role: string;
    tokenVersion?: number;
}

export interface RefreshTokenPayload {
    userId: string;
    tokenVersion: number;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
    const secret = process.env.JWT_SECRET!;
    const expiresIn = process.env.JWT_EXPIRE || "15m"; // Short-lived access token

    return jwt.sign(payload, secret, {
        expiresIn,
        issuer: 'stayhub',
        audience: 'stayhub-users'
    } as jwt.SignOptions);
};

// Backward compatibility
export const generateToken = generateAccessToken;

export const verifyAccessToken = (token: string): TokenPayload => {
    const secret = process.env.JWT_SECRET!;
    return jwt.verify(token, secret, {
        issuer: 'stayhub',
        audience: 'stayhub-users'
    }) as TokenPayload;
};

// Backward compatibility
export const verifyToken = verifyAccessToken;

export const generateRefreshToken = (userId: string, tokenVersion: number = 0): string => {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!;
    const expiresIn = process.env.JWT_REFRESH_EXPIRE || "30d";

    const payload: RefreshTokenPayload = {
        userId,
        tokenVersion
    };

    return jwt.sign(payload, secret, {
        expiresIn,
        issuer: 'stayhub',
        audience: 'stayhub-refresh'
    } as jwt.SignOptions);
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!;
    return jwt.verify(token, secret, {
        issuer: 'stayhub',
        audience: 'stayhub-refresh'
    }) as RefreshTokenPayload;
};

export const extractTokenFromHeader = (authHeader: string): string | null => {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    const parts = authHeader.split(" ");
    return parts.length >= 2 ? parts.slice(1).join(" ").trim() : null;
};

export const generateTokenPair = (userId: string, email: string, role: string, tokenVersion: number = 0): TokenPair => {
    const accessToken = generateAccessToken({ userId, email, role, tokenVersion });
    const refreshToken = generateRefreshToken(userId, tokenVersion);

    return {
        accessToken,
        refreshToken
    };
};

export const generateSecureRandomToken = (length: number = 32): string => {
    return crypto.randomBytes(length).toString('hex');
};

export const hashToken = (token: string): string => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

export const isTokenExpired = (token: string): boolean => {
    try {
        const decoded = jwt.decode(token) as any;
        if (!decoded || !decoded.exp) return true;
        return Date.now() >= decoded.exp * 1000;
    } catch {
        return true;
    }
};

export const getTokenExpiryDate = (token: string): Date | null => {
    try {
        const decoded = jwt.decode(token) as any;
        if (!decoded || !decoded.exp) return null;
        return new Date(decoded.exp * 1000);
    } catch {
        return null;
    }
};