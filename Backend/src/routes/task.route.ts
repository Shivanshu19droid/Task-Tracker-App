import { Router } from "express";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/task.controller";
import { isLoggedIn } from "../middlewares/auth.middleware";
import { validate, validateQuery } from "../middlewares/validate.middleware";
import {
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
} from "../validators/task.validator";

const router = Router();

router.get("/", isLoggedIn, validateQuery(taskQuerySchema), getTasks);
router.post("/", isLoggedIn, validate(createTaskSchema), createTask);
router.put("/:id", isLoggedIn, validate(updateTaskSchema), updateTask);
router.delete("/:id", isLoggedIn, deleteTask);

export default router;