import { useState, useEffect } from "react";
import { postForm } from "../utils/api";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  MenuItem,
  Stack,
  Container,
} from "@mui/material";

export default function Admin() {
  const [form, setForm] = useState({
    itemname: "",
    price: "",
    category: "BreakFast",
    stock: 0,
  });
  const [image, setImage] = useState(null);
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let url;
    if (image) {
      url = URL.createObjectURL(image);
      setPreview(url);
    } else {
      setPreview(null);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [image]);

  async function addItem() {
    if (!image) {
      setMsg("Please select an image before adding.");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("itemname", form.itemname);
      fd.append("price", form.price);
      fd.append("category", form.category);
      fd.append("stock", String(Math.max(0, Number(form.stock || 0))));
      fd.append("image", image);

      const res = await postForm("/food/addItem", fd);
      setMsg(res.message || "Added");
      // clear form on success
      setForm({ itemname: "", price: "", category: "BreakFast", stock: 0 });
      setImage(null);
    } catch (e) {
      console.error(e);
      setMsg("Failed to Add Item");
    } finally {
      setLoading(false);
    }
  }



  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" fontWeight={600} mb={3}>
          Admin – Food Management
        </Typography>
        <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", md: "row" } }}>
          <Stack spacing={2} sx={{ flex: 1 }}>
            <TextField
              fullWidth
              label="Item Name"
              value={form.itemname}
              onChange={(e) => setForm({ ...form, itemname: e.target.value })}
            />

            <TextField
              fullWidth
              label="Price"
              type="number"
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: parseFloat(e.target.value) })
              }
            />

            <TextField
              fullWidth
              label="Stock Quantity"
              type="number"
              inputProps={{ min: 0 }}
              value={String(form.stock ?? 0)}
              onChange={(e) =>
                setForm({ ...form, stock: Math.max(0, Number(e.target.value || 0)) })
              }
            />

            <TextField
              select
              fullWidth
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <MenuItem value="BreakFast">BreakFast</MenuItem>
              <MenuItem value="Lunch">Lunch</MenuItem>
              <MenuItem value="dinner">Dinner</MenuItem>
            </TextField>

            <Button
              variant="outlined"
              component="label"
              sx={{ textTransform: "none" }}
            >
              {image ? "Change Image" : "Select Image"}
              <input
                hidden
                accept="image/*"
                type="file"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
              />
            </Button>

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                fullWidth
                onClick={addItem}
                disabled={loading || !image}
              >
                {loading ? "Adding..." : "Add Item"}
              </Button>
            </Stack>
          </Stack>

          <Box
            sx={{
              width: { xs: "100%", md: 260 },
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                width: "100%",
                p: 2,
                textAlign: "center",
                borderRadius: 2,
              }}
            >
              {preview ? (
                <Box
                  component="img"
                  src={preview}
                  alt="preview"
                  sx={{
                    width: "100%",
                    height: 180,
                    objectFit: "cover",
                    borderRadius: 1,
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: "100%",
                    height: 180,
                    bgcolor: "action.hover",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 1,
                  }}
                >
                  <Typography color="text.secondary">
                    No image selected
                  </Typography>
                </Box>
              )}
              <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                {image ? image.name : "Select an image to preview"}
              </Typography>
            </Paper>
          </Box>
        </Box>

        {msg && (
          <Typography textAlign="center" mt={3} color="primary" fontWeight={500}>
            {msg}
          </Typography>
        )}
      </Paper>
    </Container>
  );
}
