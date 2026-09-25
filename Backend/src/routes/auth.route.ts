import { Router } from "express";
import { signup, login, logout, me } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { isLoggedIn } from "../middlewares/auth.middleware";
import { signupSchema, loginSchema } from "../validators/auth.validator";

const router = Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.get("/me", isLoggedIn, me);

export default router;