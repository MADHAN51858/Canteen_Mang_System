import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  createTable,
  joinTable,
  leaveTable,
  getMyTable,
  getActiveTables,
  addItemToTable,
  updateTableItemQty,
  removeTableItem,
  toggleMemberReady,
  placeTableOrder,
  updateTableOrderType,
} from "../controllers/table.controller.js";

const router = Router();

router.route("/create").post(verifyJwt, createTable);
router.route("/join").post(verifyJwt, joinTable);
router.route("/leave").post(verifyJwt, leaveTable);
router.route("/my-table").get(verifyJwt, getMyTable);
router.route("/active").get(verifyJwt, getActiveTables);
router.route("/add-item").post(verifyJwt, addItemToTable);
router.route("/update-qty").post(verifyJwt, updateTableItemQty);
router.route("/remove-item").post(verifyJwt, removeTableItem);
router.route("/toggle-ready").post(verifyJwt, toggleMemberReady);
router.route("/place-order").post(verifyJwt, placeTableOrder);
router.route("/update-order-type").post(verifyJwt, updateTableOrderType);

export default router;
