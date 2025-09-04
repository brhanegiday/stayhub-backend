import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import User from "../models/User";

// Google OAuth Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: "/api/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if user already exists
                const existingUser = await User.findOne({ googleId: profile.id });
                
                if (existingUser) {
                    return done(null, existingUser);
                }

                // Create new user
                const newUser = new User({
                    googleId: profile.id,
                    email: profile.emails?.[0]?.value,
                    name: profile.displayName,
                    avatar: profile.photos?.[0]?.value || "",
                    role: "renter", // Default role, can be changed later
                });

                await newUser.save();
                return done(null, newUser);
            } catch (error) {
                console.error("Google OAuth error:", error);
                return done(error, undefined);
            }
        }
    )
);

// JWT Strategy
passport.use(
    new JwtStrategy(
        {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_SECRET!,
        },
        async (payload, done) => {
            try {
                const user = await User.findById(payload.userId);
                
                if (user) {
                    return done(null, user);
                }
                
                return done(null, false);
            } catch (error) {
                console.error("JWT Strategy error:", error);
                return done(error, false);
            }
        }
    )
);

// Serialize user for the session
passport.serializeUser((user: any, done) => {
    done(null, user._id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        console.error("Deserialize user error:", error);
        done(error, null);
    }
});

export default passport;