import { useState, useEffect } from "react";
import { postForm } from "../utils/api";
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import FastfoodIcon from "@mui/icons-material/Fastfood";
import Inventory2Icon from "@mui/icons-material/Inventory2";

export default function Admin() {
  const [form, setForm] = useState({
    itemname: "",
    price: "",
    category: "BreakFast",
    stock: 0,
    description: "",
  });
  const categories = [
    { value: "BreakFast", label: "Breakfast" },
    { value: "Lunch", label: "Lunch" },
    { value: "dinner", label: "Dinner" },
  ];
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
      fd.append("description", form.description);
      fd.append("image", image);

      const res = await postForm("/food/addItem", fd);
      setMsg(res.message || "Added");
      // clear form on success
      setForm({ itemname: "", price: "", category: "BreakFast", stock: 0, description: "" });
      setImage(null);
    } catch (e) {
      console.error(e);
      setMsg("Failed to Add Item");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Container maxWidth="lg" sx={{ py: 2, px: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        <Box
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 3,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            alignItems: "center",
            background: "linear-gradient(135deg, #0f172a, #1d4ed8)",
            color: "white",
            boxShadow: "0 12px 40px rgba(0,0,0,0.24)",
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            <FastfoodIcon sx={{ fontSize: 36, color: "white" }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: "0.4px" }}>
              Product Entry
            </Typography>
            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.8)" }}>
              Add new dishes, set stock, and upload imagery that matches the menu vibe.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Inventory2Icon sx={{ color: "white", opacity: 0.9 }} />
            <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.9)" }}>
              Instant menu publish
            </Typography>
          </Stack>
        </Box>

        <Paper
          elevation={4}
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 3,
            background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 32%, #f8fafc 100%)",
            border: "1px solid #e5e7eb",
            boxShadow: "0 12px 45px rgba(15,23,42,0.08)",
          }}
        >
          <Grid container spacing={{ xs: 3, md: 18 }} alignItems="stretch">
            <Grid item xs={12} md={7}>
              <Stack spacing={2.25}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Item name
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="E.g. Spicy Paneer Wrap"
                    value={form.itemname}
                    onChange={(e) => setForm({ ...form, itemname: e.target.value })}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: "white",
                        borderRadius: 2,
                      },
                    }}
                  />
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Price (₹)
                      </Typography>
                      <TextField
                        fullWidth
                        type="number"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })}
                        sx={{ "& .MuiOutlinedInput-root": { bgcolor: "white", borderRadius: 2 } }}
                      />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Stock on hand
                      </Typography>
                      <TextField
                        fullWidth
                        type="number"
                        inputProps={{ min: 0 }}
                        value={String(form.stock ?? 0)}
                        onChange={(e) => setForm({ ...form, stock: Math.max(0, Number(e.target.value || 0)) })}
                        sx={{ "& .MuiOutlinedInput-root": { bgcolor: "white", borderRadius: 2 } }}
                      />
                    </Stack>
                  </Grid>
                </Grid>

                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Category
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                    {categories.map((c) => {
                      const active = form.category === c.value;
                      return (
                        <Button
                          key={c.value}
                          variant={active ? "contained" : "outlined"}
                          size="small"
                          onClick={() => setForm({ ...form, category: c.value })}
                          sx={{
                            textTransform: "none",
                            borderRadius: 999,
                            px: 2.4,
                            py: 0.8,
                            fontWeight: 700,
                            boxShadow: active ? "0 8px 18px rgba(30,64,175,0.25)" : "none",
                          }}
                        >
                          {c.label}
                        </Button>
                      );
                    })}
                  </Stack>
                </Stack>

                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={1}
                    placeholder="E.g. Crispy paneer cubes with mint chutney"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: "white",
                        borderRadius: 2,
                      },
                    }}
                  />
                </Stack>

                <Stack spacing={1.25} direction={{ xs: "column", sm: "row" }} alignItems="center">
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CloudUploadIcon />}
                    sx={{
                      textTransform: "none",
                      px: 2.5,
                      py: 1.1,
                      borderRadius: 2,
                      fontWeight: 700,
                      bgcolor: "white",
                    }}
                  >
                    {image ? "Replace image" : "Upload image"}
                    <input
                      hidden
                      accept="image/*"
                      type="file"
                      onChange={(e) => setImage(e.target.files?.[0] || null)}
                    />
                  </Button>

                  <Box sx={{ color: "text.secondary", fontSize: 13 }}>
                    Use bright, appetizing photos. JPG/PNG up to 5 MB.
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                  <Button
                    variant="contained"
                    onClick={addItem}
                    disabled={loading || !image}
                    sx={{
                      textTransform: "none",
                      borderRadius: 2,
                      px: 3,
                      py: 1.1,
                      fontWeight: 800,
                      boxShadow: "0 12px 24px rgba(59,130,246,0.32)",
                    }}
                    startIcon={<CloudUploadIcon />}
                  >
                    {loading ? "Adding..." : "Publish item"}
                  </Button>
                </Stack>
              </Stack>
            </Grid>

            <Grid item xs={12} md={5} display="flex" justifyContent="flex-end">
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 3,
                  height: "100%",
                  background: "linear-gradient(145deg, #f1f5f9, #ffffff)",
                  borderColor: "#e2e8f0",
                  minWidth: { xs: "100%", md: 320 },
                }}
              >
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  Image preview
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Check how the dish appears in cards before publishing.
                </Typography>

                {preview ? (
                  <Box
                    component="img"
                    src={preview}
                    alt="preview"
                    sx={{
                      width: "100%",
                      height: 240,
                      objectFit: "cover",
                      borderRadius: 2,
                      border: "1px solid #dbeafe",
                      boxShadow: "0 10px 30px rgba(30,64,175,0.12)",
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: "100%",
                      height: 240,
                      bgcolor: "#e2e8f0",
                      borderRadius: 2,
                      border: "1px dashed #94a3b8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "text.secondary",
                      fontWeight: 600,
                      letterSpacing: 0.2,
                    }}
                  >
                    No image selected
                  </Box>
                )}

                <Typography variant="caption" sx={{ mt: 1.5, display: "block", color: "text.secondary" }}>
                  {image ? image.name : "Select an image to preview"}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {msg && (
            <Alert
              severity={msg.toLowerCase().includes("fail") ? "error" : "success"}
              sx={{ mt: 3, borderRadius: 2 }}
            >
              {msg}
            </Alert>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
