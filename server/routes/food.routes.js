import { Router } from "express";
import {
    addItem,
    updateItem,
    removeItem,
    getItemsBasedOnCategory,
    getAllFoods,
    rateFood
} from "../controllers/food.controller.js"
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js"


const router = Router()

router.route("/addItem").post(verifyJwt, upload.single("image"),addItem)
router.route("/removeItem").post(verifyJwt, removeItem)
router.route("/updateItem").post(verifyJwt, upload.single("image"), updateItem)
router.route("/getCategoryItems").post(verifyJwt, getItemsBasedOnCategory)
router.route("/getAllFoods").post(verifyJwt, getAllFoods)
router.route("/rateFood").post(verifyJwt, rateFood)

export default router;