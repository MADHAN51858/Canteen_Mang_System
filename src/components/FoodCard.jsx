






// import { useContext, useState } from "react";
// import { CartContext } from "../context/CartContext";
import { useContext, useState, useMemo } from "react";
import { CartContext } from "../context/CartContext";
import { post, postForm } from "../utils/api";
import { useSnackbar } from "../hooks/useSnackbar";
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Button,
  Box,
  MenuItem,
  Stack,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
} from "@mui/material";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import DeleteIcon from "@mui/icons-material/Delete";
import StarRoundedIcon from "@mui/icons-material/StarRounded";

export default function FoodCard({ item, onAdd, onRemove, onUpdate }) {
  const { user, cart, increaseQuantity, decreaseQuantity } = useContext(CartContext);
  const { enqueueSnackbar } = useSnackbar();
  const rv = String((user && user.role) || "").toLowerCase();

  const cartItem = cart.find((i) => i._id === item._id);
  const inCart = !!cartItem;
  const quantity = cartItem?.quantity || 0;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    itemname: item.itemname,
    price: item.price,
    category: item.category || "",
    stock: Number(item.stock || 0),
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(item.image || null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [secretDialog, setSecretDialog] = useState(false);
  const [secretInput, setSecretInput] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  // Rating Modal State
  const [ratingModal, setRatingModal] = useState(false);
  const [ratingVal, setRatingVal] = useState(5);
  const [submittingRate, setSubmittingRate] = useState(false);

  const avgRating = useMemo(() => {
    if (typeof item.averageRating === "number" && item.averageRating > 0) {
      return item.averageRating.toFixed(1);
    }
    if (Array.isArray(item.ratings) && item.ratings.length > 0) {
      const sum = item.ratings.reduce((s, r) => s + (Number(r.rating) || 0), 0);
      return (sum / item.ratings.length).toFixed(1);
    }
    if (item.rating) return Number(item.rating).toFixed(1);
    return "0.0";
  }, [item]);

  async function submitFoodRating() {
    try {
      setSubmittingRate(true);
      const res = await post("/food/rateFood", {
        foodId: item._id,
        rating: ratingVal,
      });
      if (res?.status === 200 || res?.success) {
        enqueueSnackbar(`Rated ${item.itemname} ${ratingVal} stars!`, { variant: "success" });
        if (typeof onUpdate === "function") {
          onUpdate({
            ...item,
            averageRating: res.data?.averageRating ?? ratingVal,
            totalRatings: res.data?.totalRatings ?? ((item.totalRatings || 0) + 1),
            ratings: res.data?.ratings ?? item.ratings,
          });
        }
        setRatingModal(false);
      } else {
        enqueueSnackbar(res?.message || "Failed to rate item", { variant: "error" });
      }
    } catch (e) {
      enqueueSnackbar("Failed to rate item", { variant: "error" });
    } finally {
      setSubmittingRate(false);
    }
  }

  async function updateItem() {
    setLoading(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("id", item._id);
      fd.append("itemname", form.itemname);
      fd.append("price", String(form.price));
      fd.append("category", form.category);
      fd.append("stock", String(form.stock ?? 0));
      if (file) fd.append("image", file);

      const res = await postForm("/food/updateItem", fd);
      if (res?.status === 200 || res?.success) {
        if (typeof onUpdate === "function") onUpdate(res.data);
        setMsg("Updated");
        enqueueSnackbar("Item updated successfully!", { variant: "success" });
        setEditing(false);
      } else {
        const errMsg = res?.message || "Failed to update";
        setMsg(errMsg);
        enqueueSnackbar(errMsg, { variant: "error" });
      }
    } catch (e) {
      console.log(e);
      setMsg("Failed to Update Item");
      enqueueSnackbar("Failed to update item", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  function openSecretDialog(itemname) {
    setPendingDelete(itemname);
    setSecretInput("");
    setSecretDialog(true);
  }

  async function confirmSecretCode() {
    if (secretInput === "madhu") {
      setSecretDialog(false);
      setSecretInput("");
      await removeMenuItem(pendingDelete);
      setPendingDelete(null);
    } else {
      setSecretInput("");
      enqueueSnackbar("Incorrect security code", { variant: "error" });
    }
  }

  async function removeMenuItem(itemname) {
    try {
      const res = await post("/food/removeItem", { itemname });
      if (res?.status === 200 || res?.success) {
        if (typeof onRemove === "function") onRemove(itemname);
        enqueueSnackbar("Item deleted successfully", { variant: "success" });
      } else {
        enqueueSnackbar(res?.message || "Failed to delete item", { variant: "error" });
      }
    } catch (e) {
      console.log("Failed to remove item", e);
      enqueueSnackbar("Failed to delete item", { variant: "error" });
    }
  }

  const isAdmin = rv.includes("admin") || rv.includes("staff");
  const isStudent = rv.includes("student");
  const currentCartQty = cartItem?.quantity || 0;
  const remaining = Math.max(0, Number(item.stock || 0) - currentCartQty);

  return (
    <Card
      elevation={0}
      sx={{
        display: "flex",
        flexDirection: "column",
        p: 0,
        borderRadius: "16px",
        bgcolor: "background.paper",
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        border: "none",
        overflow: "hidden",
        position: "relative",
        width: "100%",
        // height: "460px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        "&:hover": {
          transform: "translateY(-12px)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.16)",
        },
      }}
    >
      {/* Premium Badge */}
      <Box
        sx={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 10,
          bgcolor: "success.main",
          color: "white",
          px: 1.5,
          py: 0.5,
          borderRadius: "20px",
          fontSize: "0.75rem",
          fontWeight: 800,
          textTransform: "uppercase",
        }}
      >
        Fresh
      </Box>

      {/* Image Container */}
      <Tooltip title={item.itemname} placement="top">
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: 160,
            overflow: "hidden",
            bgcolor: "#f0f0f0",
          }}
        >
          <CardMedia
            component="img"
            image={preview || item.image || "https://via.placeholder.com/280x160?text=" + item.itemname}
            alt={item.itemname}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </Box>
      </Tooltip>

      {/* Content Container */}
      <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.75, p: 1.5, pb: 0.75 }}>
        {!editing ? (
          <>
            {/* Category and Average Rating row */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.2 }}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  px: 0.85,
                  py: 0.2,
                  borderRadius: "5px",
                  backgroundColor: "#F1F5F9",
                  color: "#475569",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                }}
              >
                {item.category || "General"}
              </Box>

              <Tooltip title="Click to rate this dish" arrow>
                <Box
                  onClick={() => {
                    setRatingVal(5);
                    setRatingModal(true);
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.35,
                    cursor: "pointer",
                    px: 0.75,
                    py: 0.2,
                    borderRadius: "6px",
                    backgroundColor: "#FFFBEB",
                    border: "1px solid #FEF3C7",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      backgroundColor: "#FEF3C7",
                      borderColor: "#FDE68A",
                      transform: "scale(1.04)",
                    },
                  }}
                >
                  <StarRoundedIcon sx={{ color: "#F59E0B", fontSize: 16 }} />
                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#92400E" }}>
                    {avgRating}
                  </Typography>
                  <Typography sx={{ fontSize: "0.68rem", fontWeight: 500, color: "#B45309" }}>
                    ({item.totalRatings || (Array.isArray(item.ratings) ? item.ratings.length : 0)})
                  </Typography>
                </Box>
              </Tooltip>
            </Box>

            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2, fontSize: "1rem", minHeight: 28, textTransform: "capitalize" }}>
                {item.itemname}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ minHeight: 36, fontSize: "0.85rem", lineHeight: 1.3 }}>
              {item.description || "Tasty and freshly prepared."}
            </Typography>

            <Box sx={{ py: 0.5 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                    Price
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      color: "success.main",
                      fontWeight: 900,
                      fontSize: "1.35rem",
                    }}
                  >
                    ₹{item.price}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                    Left
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: remaining > 0 ? "success.main" : "error.main",
                      fontWeight: 800,
                      fontSize: "0.9rem",
                    }}
                  >
                    {remaining > 0 ? remaining : "Out"}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            <TextField
              label="Name"
              value={form.itemname}
              onChange={(e) => setForm((s) => ({ ...s, itemname: e.target.value }))}
              size="small"
              fullWidth
            />
            <TextField
              label="Price"
              value={String(form.price)}
              onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
              size="small"
              fullWidth
            />
            <TextField
              select
              fullWidth
              label="Category"
              value={form.category}
              onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
              size="small"
            >
              <MenuItem value="BreakFast">BreakFast</MenuItem>
              <MenuItem value="Lunch">Lunch</MenuItem>
              <MenuItem value="dinner">Dinner</MenuItem>
            </TextField>
            <Box>
              <input
                id={`file-${item._id}`}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  if (f) setPreview(URL.createObjectURL(f));
                }}
                style={{ marginTop: 4 }}
              />
            </Box>
            <TextField
              label="Stock"
              type="number"
              inputProps={{ min: 0 }}
              value={String(form.stock ?? 0)}
              onChange={(e) => setForm((s) => ({ ...s, stock: Math.max(0, Number(e.target.value || 0)) }))}
              size="small"
              fullWidth
            />
            {msg && <Typography variant="caption" color="error">{msg}</Typography>}
          </Box>
        )}
      </CardContent>

      {/* Actions Container */}
      <Box sx={{ p: 1.25, pt: 0.75, borderTop: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" spacing={0.75} sx={{ width: "100%" }}>
          {isAdmin && (
            <>
              {!editing ? (
                <>
                  <Tooltip title="Remove from menu">
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => openSecretDialog(item.itemname)}
                      startIcon={<DeleteIcon />}
                      sx={{
                        fontWeight: 700,
                        textTransform: "none",
                        borderRadius: "8px",
                        whiteSpace: "nowrap",
                        flex: 1,
                        fontSize: "0.8rem",
                        p: 0.75,
                      }}
                    >
                      Remove
                    </Button>
                  </Tooltip>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => setEditing(true)}
                    sx={{
                      fontWeight: 700,
                      textTransform: "none",
                      borderRadius: "8px",
                      whiteSpace: "nowrap",
                      flex: 1,
                      fontSize: "0.8rem",
                      p: 0.75,
                    }}
                  >
                    Edit
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    onClick={updateItem}
                    disabled={loading}
                    fullWidth
                    sx={{ fontWeight: 700, textTransform: "none", borderRadius: "8px", p: 0.75 }}
                  >
                    {loading ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="small"
                    onClick={() => {
                      setEditing(false);
                      setForm({ itemname: item.itemname, price: item.price, category: item.category || "", stock: Number(item.stock || 0) });
                      setMsg("");
                    }}
                    fullWidth
                    sx={{ fontWeight: 700, textTransform: "none", borderRadius: "8px", p: 0.75 }}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </>
          )}

          {isStudent && (
            <>
              {!inCart ? (
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="small"
                  onClick={() => onAdd(item)}
                  disabled={Number(item.stock || 0) <= 0}
                  startIcon={<AddShoppingCartIcon />}
                  sx={{
                    fontWeight: 800,
                    textTransform: "none",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    p: 0.75,
                  }}
                >
                  {Number(item.stock || 0) > 0 ? "Add" : "Out"}
                </Button>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 0.5,
                    bgcolor: "primary.light",
                    borderRadius: "8px",
                    p: 0.5,
                    flex: 1,
                  }}
                >
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => decreaseQuantity(item._id)}
                    sx={{
                      minWidth: 28,
                      width: 28,
                      height: 28,
                      p: 0,
                      bgcolor: "white",
                      color: "primary.main",
                      fontWeight: 900,
                      fontSize: "1rem",
                      "&:hover": {
                        bgcolor: "grey.200",
                      },
                    }}
                  >
                    −
                  </Button>
                  <Typography
                    sx={{
                      minWidth: 28,
                      textAlign: "center",
                      fontWeight: 900,
                      color: "white",
                      fontSize: "0.9rem",
                    }}
                  >
                    {quantity}
                  </Typography>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => increaseQuantity(item._id)}
                    disabled={remaining <= 0}
                    sx={{
                      minWidth: 28,
                      width: 28,
                      height: 28,
                      p: 0,
                      bgcolor: "white",
                      color: "primary.main",
                      fontWeight: 900,
                      fontSize: "1rem",
                      "&:hover": {
                        bgcolor: "grey.200",
                      },
                    }}
                  >
                    +
                  </Button>
                </Box>
              )}
            </>
          )}
        </Stack>
      </Box>

      {/* Secret Code Dialog */}
      <Dialog open={secretDialog} onClose={() => setSecretDialog(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Enter Secret Code</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            type="password"
            label="Secret Code"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") confirmSecretCode();
            }}
            placeholder="Enter code to confirm deletion"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSecretDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmSecretCode}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Food Rating Dialog */}
      <Dialog
        open={ratingModal}
        onClose={() => setRatingModal(false)}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            p: 1,
            maxWidth: "360px",
            width: "100%",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.05rem", color: "#0F172A", pb: 0.5 }}>
          Rate {item.itemname}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 2 }}>
          {item.image && (
            <Box
              component="img"
              src={item.image}
              alt={item.itemname}
              sx={{
                width: 75,
                height: 75,
                borderRadius: "10px",
                objectFit: "cover",
                mb: 1.5,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            />
          )}
          <Typography sx={{ fontSize: "0.86rem", color: "#64748B", mb: 1, textAlign: "center" }}>
            How would you rate this dish?
          </Typography>
          <Rating
            name="foodcard-rating"
            value={ratingVal}
            precision={1}
            size="large"
            onChange={(event, newValue) => {
              if (newValue !== null) setRatingVal(newValue);
            }}
            sx={{
              fontSize: "2.2rem",
              color: "#F59E0B",
              mb: 1.5,
            }}
          />
          <Typography sx={{ fontSize: "0.78rem", color: "#94A3B8" }}>
            Current Average: {avgRating} ★ ({item.totalRatings || (Array.isArray(item.ratings) ? item.ratings.length : 0)} reviews)
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setRatingModal(false)}
            disabled={submittingRate}
            sx={{
              textTransform: "none",
              color: "#64748B",
              fontWeight: 600,
              borderRadius: "8px",
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitFoodRating}
            disabled={submittingRate}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "8px",
              backgroundColor: "#2563EB",
              "&:hover": { backgroundColor: "#1D4ED8" },
              px: 2.5,
            }}
          >
            {submittingRate ? "Submitting..." : "Submit Rating"}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
