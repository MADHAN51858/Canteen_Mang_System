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
    cancelOrder,
    getMe,
    updateUserRole,
    toggleBlockUser,
    deleteUser,
    addMoneyToWallet,
    deductFromWallet,
    updateProfile,
    withdrawAmount,
} from "../controllers/user.controller.js"
import { verifyJwt } from "../middlewares/auth.middleware.js"

const router = Router()

router.route("/register").post(registerUser)
router.route("/login").post(login)
router.route("/logout").post(verifyJwt, logout)
router.route("/getMe").get(verifyJwt, getMe)
router.route("/updateRole").post(verifyJwt, updateUserRole)
router.route("/updateProfile").post(verifyJwt, updateProfile)
router.route("/withdrawAmount").post(verifyJwt, withdrawAmount)
router.route("/toggleBlockUser").post(verifyJwt, toggleBlockUser)
router.route("/deleteUser").post(verifyJwt, deleteUser)
router.route("/addFriends").post(verifyJwt,addFriends)
router.route("/findUser").post(verifyJwt,findUser)
router.route("/getAllUsers").post(verifyJwt,getAllUsers)
router.route("/removeFreinds").post(verifyJwt,removeFreinds)
router.route("/getFreiendsList").post(verifyJwt,getFreiendsList)
router.route("/getUserId").post(verifyJwt,getUserId)
router.route("/orderFood").post(verifyJwt,orderFood)
router.route("/cancelOrder").post(verifyJwt,cancelOrder)
router.route("/addMoney").post(verifyJwt, addMoneyToWallet)
router.route("/deductFromWallet").post(verifyJwt, deductFromWallet)

export default router;