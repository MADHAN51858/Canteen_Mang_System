import { Router } from "express";
import {
  getAllCategories,
  addCategory,
  removeCategory,
  updateCategory,
} from "../controllers/category.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/getAll").post(getAllCategories);
router.route("/add").post(verifyJwt, addCategory);
router.route("/remove").post(verifyJwt, removeCategory);
router.route("/update").post(verifyJwt, updateCategory);

export default router;
