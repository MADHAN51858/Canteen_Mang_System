import { Router } from "express";
import {
    getUserOrderList,
    getOrderList,
    markCompleteByBarcode,
    markPreparing,
    getDailyOrderStats,
    getCategoryFoodStats,
    getCategoryCrossStats,
    getCategoryRevenueStats,
    getCategoryFoodRevenueStats,
    getOrderStats,
    getOrderStatusStats,
} from "../controllers/order.controller.js"
import { verifyJwt } from "../middlewares/auth.middleware.js"


const router = Router()

router.route("/getUserOrderList").post(verifyJwt, getUserOrderList)
router.route("/getOrderList").post(verifyJwt, getOrderList)
router.route("/markCompleteByBarcode").post(verifyJwt, markCompleteByBarcode)
router.route("/markPreparing").post(verifyJwt, markPreparing)
router.route("/getDailyOrderStats").post(verifyJwt, getDailyOrderStats)
router.route("/getCategoryFoodStats").post(verifyJwt, getCategoryFoodStats)
router.route("/getCategoryCrossStats").post(verifyJwt, getCategoryCrossStats)
router.route("/getCategoryRevenueStats").post(verifyJwt, getCategoryRevenueStats)
router.route("/getCategoryFoodRevenueStats").post(verifyJwt, getCategoryFoodRevenueStats)
router.route("/getOrderStats").post(verifyJwt, getOrderStats)
router.route("/getOrderStatusStats").post(verifyJwt, getOrderStatusStats)


export default router;