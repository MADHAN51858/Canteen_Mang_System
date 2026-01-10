
// import { useContext, useState } from "react";
// import { CartContext } from "../context/CartContext";
// import { post } from "../utils/api";


// export default function FoodCard({item, onAdd, onRemove}){
  
//     const { user } = useContext(CartContext)
//     const rv = String((user && user.roll) || '').toLowerCase()

//         async function removeMenuItem( item ) {
//         try {
//           // backend expects { itemNames: [ ... ] }
//           const res = await post("/food/removeItem", { itemNames: [item.itemname] } );
//           if (res?.status === 200 || res?.success) {
//             console.log("Successfully removed Item from menu");
//             // notify parent to remove from UI list
//             if (typeof onRemove === 'function') onRemove(item.itemname)
//           } else {
//             console.log("Failed to remove Item from menu",res);
//           }

//         } catch (e) {
//           console.log('Failed to remove Item from menu',e)
//         }
//       }
      
//   let btn;
//     if(rv.includes('admin')){
//       btn =( <button onClick={() => removeMenuItem(item)}>remove</button>)
//     }else if(rv.includes('student')){
//       btn = (<button onClick={() => onAdd(item)}>Add</button>)
//     }
//     return (
//     <div style={{border:'1px solid #ddd',padding:12,borderRadius:6,display:'flex',gap:12,alignItems:'center'}}>
//       <img src={item.image || 'https://via.placeholder.com/80'} alt="food" style={{width:80,height:80,objectFit:'cover',borderRadius:6}} />
//       <div style={{flex:1}}>
//         <div style={{fontWeight:700}}>{item.itemname}</div>
//         <div>₹{item.price}</div>
//       </div>
//       {btn}
//     </div>
//   )
// }









import { useContext, useState } from "react";
import { CartContext } from "../context/CartContext";
import { post, postForm } from "../utils/api";
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
} from "@mui/material";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import DeleteIcon from "@mui/icons-material/Delete";

export default function FoodCard({ item, onAdd, onRemove, onUpdate }) {
  const { user, cart, increaseQuantity, decreaseQuantity } = useContext(CartContext);
  const rv = String((user && user.role) || "").toLowerCase();

  // Check if item is in cart and get its quantity
  const cartItem = cart.find(i => i._id === item._id);
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

  async function updateItem() {
    setLoading(true);
    setMsg("");
    try {
      // send multipart/form-data (supports image upload)
  const fd = new FormData();
  fd.append('id', item._id);
  fd.append('itemname', form.itemname);
  fd.append('price', String(form.price));
  fd.append('category', form.category);
  fd.append('stock', String(form.stock ?? 0));
  if (file) fd.append('image', file);
  const res = await postForm('/food/updateItem', fd);
      if (res?.status === 200 || res?.success) {
        // res.data contains updated item
        if (typeof onUpdate === "function") onUpdate(res.data);
        // fallback: if parent passed onRemove for name changes, it's still preserved
        setMsg("Updated");
        setEditing(false);
      } else {
        setMsg(res.message || "Failed to update");
      }
    } catch (e) {
      console.log(e);
      setMsg("Failed to Update Item");
    } finally {
      setLoading(false);
    }
  }

  async function removeMenuItem(itemname) {
    try {
      const res = await post("/food/removeItem", { itemname });
      if (res?.status === 200 || res?.success) {
        if (typeof onRemove === "function") onRemove(itemname);
      }
    } catch (e) {
      console.log("Failed to remove item", e);
    }
  }

  const isAdmin = rv.includes("admin");
  const isStudent = rv.includes("student");
  const currentCartQty = cartItem?.quantity || 0;
  const remaining = Math.max(0, Number(item.stock || 0) - currentCartQty);

  return (
    <Card
      elevation={2}
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        p: 2,
        gap: 2,
        borderRadius: 3,
        alignItems: { xs: "flex-start", sm: "center" },
        bgcolor: "background.paper",
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        border: "1px solid",
        borderColor: "divider",
        "&:hover": {
          transform: "translateY(-6px)",
          boxShadow: (theme) => theme.shadows[8],
          borderColor: "primary.main",
        },
        height: "100%",
      }}
    >
      {/* Image */}
      <Tooltip title={item.itemname} placement="top">
        <CardMedia
          component="img"
          image={preview || item.image || "https://via.placeholder.com/100?text=" + item.itemname}
          alt={item.itemname}
          sx={{
            width: { xs: "100%", sm: 100 },
            height: 100,
            borderRadius: 2,
            objectFit: "cover",
            border: "2px solid",
            borderColor: "primary.light",
          }}
        />
      </Tooltip>

      {/* Content */}
      <CardContent sx={{ flex: 1, p: "0!important", display: "flex", flexDirection: "column", gap: 0.5 }}>
        {!editing ? (
          <>
            <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: { xs: "0.95rem", sm: "1rem" } }}>
              {item.itemname}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "success.main",
                fontWeight: 700,
                fontSize: "1.1rem",
              }}
            >
              ₹{item.price}
            </Typography>
            {item.inStock !== undefined && (
              <Typography
                variant="caption"
                sx={{
                  color: item.inStock ? "success.main" : "error.main",
                  fontWeight: 600,
                }}
              >
                {item.inStock ? `✓ In Stock (${remaining} left)` : "Out of Stock"}
              </Typography>
            )}
          </>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
            {/* <TextField
              label="Category"
              value={form.category}
              onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
              size="small"
              fullWidth
            /> */}
              <TextField
            select
            fullWidth
            label="Category"
            value={form.category}
            onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
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
                style={{ marginTop: 6 }}
              />
            </Box>
            {/* In Stock is derived from stock; checkbox removed */}
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

      {/* Actions */}
      <Stack direction={{ xs: "row", sm: "column" }} gap={1} sx={{ flexShrink: 0 }}>
        {isAdmin && (
          <>
            {!editing ? (
              <>
                <Tooltip title="Remove from menu">
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => removeMenuItem(item.itemname)}
                    startIcon={<DeleteIcon />}
                    sx={{
                      fontWeight: 600,
                      textTransform: "none",
                      borderRadius: 2,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Remove
                  </Button>
                </Tooltip>
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  onClick={() => setEditing(true)}
                  sx={{
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: 2,
                    whiteSpace: "nowrap",
                  }}
                >
                  Edit
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={updateItem}
                  disabled={loading}
                  sx={{ fontWeight: 600, textTransform: "none", borderRadius: 2 }}
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
                  sx={{ fontWeight: 600, textTransform: "none", borderRadius: 2 }}
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
              <Tooltip title="Add to cart">
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() => onAdd(item)}
                  disabled={Number(item.stock || 0) <= 0}
                  startIcon={<AddShoppingCartIcon />}
                  sx={{
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: 2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {Number(item.stock || 0) > 0 ? "Add" : "Out of Stock"}
                </Button>
              </Tooltip>
            ) : (
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  bgcolor: 'primary.light',
                  borderRadius: 2,
                  p: 0.5
                }}
              >
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => decreaseQuantity(item._id)}
                  sx={{
                    minWidth: 32,
                    width: 32,
                    height: 32,
                    p: 0,
                    bgcolor: 'white',
                    color: 'primary.main',
                    fontWeight: 700,
                    fontSize: '1.2rem',
                    '&:hover': {
                      bgcolor: 'grey.100',
                    },
                  }}
                >
                  −
                </Button>
                <Typography 
                  sx={{ 
                    minWidth: 24, 
                    textAlign: 'center', 
                    fontWeight: 700,
                    color: 'white'
                  }}
                >
                  {quantity}
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => increaseQuantity(item._id)}
                  disabled={remaining <= 0}
                  sx={{
                    minWidth: 32,
                    width: 32,
                    height: 32,
                    p: 0,
                    bgcolor: 'white',
                    color: 'primary.main',
                    fontWeight: 700,
                    fontSize: '1.2rem',
                    '&:hover': {
                      bgcolor: 'grey.100',
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
    </Card>
  );
}
