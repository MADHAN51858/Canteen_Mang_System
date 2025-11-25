import { Router } from "express";
import {
    getUserOrderList,
    getOrderList,
} from "../controllers/order.controller.js"

const router = Router()

router.route("/getUserOrderList").post(getUserOrderList)
router.route("/getOrderList").post(getOrderList)


export default router;