import { Router } from "express";
import {
    registerUser,
    login,
    logout,
    findUser,
    addFriends,
    removeFreinds,
    getFreiendsList,
    getUserId,
    orderFood,
    getAllUsers,
    cancelOrder
    
} from "../controllers/user.controller.js"
import { verifyJwt } from "../middlewares/auth.middleware.js"

const router = Router()

router.route("/register").post(registerUser)
router.route("/login").post(login)
router.route("/logout").post(verifyJwt, logout)
router.route("/addFriends").post(addFriends)
router.route("/findUser").post(findUser)
router.route("/getAllUsers").post(getAllUsers)
router.route("/removeFreinds").post(removeFreinds)
router.route("/getFreiendsList").post(getFreiendsList)
router.route("/getUserId").post(getUserId)
router.route("/orderFood").post(orderFood)
router.route("/cancelOrder").post(cancelOrder)


export default router;