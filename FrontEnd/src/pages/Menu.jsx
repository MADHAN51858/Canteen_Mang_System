import { useEffect, useState, useContext } from "react";
import { getCategoryItems } from "../utils/api";
import FoodCard from "../components/FoodCard";
import { CartContext } from "../context/CartContext";

import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Paper,
  Grid,
  Container,
  Stack,
  Skeleton,
} from "@mui/material";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";

export default function Menu() {
  const [category, setCategory] = useState("BreakFast");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { addToCart } = useContext(CartContext);

  function handleRemove(itemname) {
    setItems((prev) => prev.filter((it) => it.itemname !== itemname));
  }

  function handleUpdate(updatedItem) {
    setItems((prev) => prev.map((it) => (String(it._id) === String(updatedItem._id) ? updatedItem : it)));
  }

  useEffect(() => {
    setLoading(true);
    getCategoryItems(category)
      .then((r) => {
        if (r && r.data) setItems(r.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        p: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 4 }}>
          <RestaurantMenuIcon sx={{ fontSize: 32, color: "primary.main" }} />
          <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: "1.75rem", sm: "2.5rem" } }}>
            Menu
          </Typography>
        </Stack>

        {/* Category Filter */}
        <Paper
          elevation={2}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 3,
            background: "linear-gradient(135deg, rgba(22, 101, 192, 0.05) 0%, rgba(47, 182, 179, 0.05) 100%)",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 80 }}>
              Category:
            </Typography>
            <FormControl sx={{ minWidth: 200 }}>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  transition: "all 0.3s",
                  "&:focus-visible": {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                  },
                }}
              >
                <MenuItem value="BreakFast">🌅 BreakFast</MenuItem>
                <MenuItem value="Lunch">🍽️ Lunch</MenuItem>
                <MenuItem value="dinner">🌙 Dinner</MenuItem>
              </Select>
            </FormControl>

            {items.length > 0 && (
              <Box
                sx={{
                  ml: "auto",
                  px: 2,
                  py: 0.7,
                  bgcolor: "success.light",
                  color: "success.dark",
                  borderRadius: 2,
                  fontWeight: 700,
                  fontSize: "0.9rem",
                }}
              >
                {items.length} items available
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Loading State */}
        {loading && (
          <Grid container spacing={2}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Paper sx={{ p: 2, borderRadius: 3 }}>
                  <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2, mb: 1 }} />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" width="60%" />
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <Paper
            sx={{
              p: 6,
              textAlign: "center",
              borderRadius: 3,
              bgcolor: "action.hover",
            }}
          >
            <RestaurantMenuIcon sx={{ fontSize: 56, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No items available for {category}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Try selecting a different category!
            </Typography>
          </Paper>
        )}

        {/* Food Items Grid */}
        {!loading && items.length > 0 && (
          <Grid container spacing={2}>
            {items.map((it) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={it._id}>
                <FoodCard item={it} onAdd={addToCart} onRemove={handleRemove} onUpdate={handleUpdate} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
