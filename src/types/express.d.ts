import { IUser } from "../models/User";

declare global {
    namespace Express {
        interface Request {
            user?: IUser;
            file?: Express.Multer.File;
            files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
        }
    }
}

export {};
