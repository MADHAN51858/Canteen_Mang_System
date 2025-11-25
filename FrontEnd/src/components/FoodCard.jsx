
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
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import DeleteIcon from "@mui/icons-material/Delete";

export default function FoodCard({ item, onAdd, onRemove, onUpdate }) {
  const { user } = useContext(CartContext);
  const rv = String((user && user.role) || "").toLowerCase();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    itemname: item.itemname,
    price: item.price,
    category: item.category || "",
    inStock: !!item.inStock,
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
  fd.append('inStock', form.inStock ? 'true' : 'false');
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
                {item.inStock ? "✓ In Stock" : "Out of Stock"}
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
            <FormControlLabel
              control={<Checkbox checked={!!form.inStock} onChange={(e) => setForm((s) => ({ ...s, inStock: e.target.checked }))} />}
              label="In Stock"
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
                    setForm({ itemname: item.itemname, price: item.price, category: item.category || "", inStock: !!item.inStock });
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
          <Tooltip title="Add to cart">
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={() => onAdd(item)}
              startIcon={<AddShoppingCartIcon />}
              sx={{
                fontWeight: 600,
                textTransform: "none",
                borderRadius: 2,
                whiteSpace: "nowrap",
              }}
            >
              Add
            </Button>
          </Tooltip>
        )}
      </Stack>
    </Card>
  );
}
