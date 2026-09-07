import { ApiError } from "../utils/ApiError.js";
import { asyncHandler  } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User} from "../models/user.model.js";

export const verifyJwt = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select(" -password -refreshToken");

        if (!user) {
            throw new ApiError(401, "Invalid Access token");
        }

        if (user.blocked || user.status === "block" || user.status === "blocked") {
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            };
            if (res && res.clearCookie) {
                res.clearCookie("accessToken", cookieOptions);
                res.clearCookie("refreshToken", cookieOptions);
            }
            throw new ApiError(401, "Your account has been blocked by an administrator");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token");
    }
});