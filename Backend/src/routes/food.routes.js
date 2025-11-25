import { Router } from "express";
import {
    addItem,
    updateItem,
    removeItem,
    getItemsBasedOnCategory
} from "../controllers/food.controller.js"
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.route("/addItem").post(upload.single("image"),addItem)

router.route("/removeItem").post(removeItem)
router.route("/updateItem").post(upload.single("image"), updateItem)
router.route("/getCategoryItems").post(getItemsBasedOnCategory)

export default router;