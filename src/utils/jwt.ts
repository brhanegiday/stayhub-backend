import jwt from "jsonwebtoken";

export interface TokenPayload {
    userId: string;
    email: string;
    role: string;
}

export const generateToken = (payload: TokenPayload): string => {
    const secret = process.env.JWT_SECRET!;
    const expiresIn = process.env.JWT_EXPIRE || "7d";

    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

export const verifyToken = (token: string): TokenPayload => {
    const secret = process.env.JWT_SECRET!;
    return jwt.verify(token, secret) as TokenPayload;
};

export const generateRefreshToken = (userId: string): string => {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!;
    const expiresIn = process.env.JWT_REFRESH_EXPIRE || "30d";

    return jwt.sign({ userId }, secret, { expiresIn } as jwt.SignOptions);
};

export const verifyRefreshToken = (token: string): { userId: string } => {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!;
    return jwt.verify(token, secret) as { userId: string };
};

export const extractTokenFromHeader = (authHeader: string): string | null => {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    return authHeader.split(" ")[1];
};