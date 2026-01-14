import { useEffect, useState, useContext, useCallback } from "react";
import { getCategoryItems } from "../utils/api";
import FoodCard from "../components/FoodCard";
import { CartContext } from "../context/CartContext";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Container,
  Stack,
  Skeleton,
  Button,
} from "@mui/material";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import RefreshIcon from "@mui/icons-material/Refresh";

export default function Menu() {
  const [category, setCategory] = useState("BreakFast");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { addToCart } = useContext(CartContext);

  const categories = [
    { value: "BreakFast", label: "BreakFast", emoji: "🌅" },
    { value: "Lunch", label: "Lunch", emoji: "🍽️" },
    { value: "dinner", label: "Dinner", emoji: "🌙" },
  ];

  function handleRemove(itemname) {
    setItems((prev) => prev.filter((it) => it.itemname !== itemname));
  }

  function handleUpdate(updatedItem) {
    setItems((prev) => prev.map((it) => (String(it._id) === String(updatedItem._id) ? updatedItem : it)));
  }

  const fetchItems = useCallback(
    async (nextCategory) => {
      const targetCat = nextCategory || category;
      setLoading(true);
      try {
        const r = await getCategoryItems(targetCat);
        setItems(r?.data || []);
      } catch (err) {
        console.error(err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [category]
  );

  useEffect(() => {
    fetchItems(category);
  }, [category, fetchItems]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#ffffff",
        p: { xs: 2, sm: 3, md: 3.5 },
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{
            mb: 4,
            p: { xs: 2.5, md: 3.5 },
            background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)",
            borderRadius: 3,
            color: "white",
            boxShadow: "0 12px 40px rgba(30,64,175,0.25)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative background element */}
          <Box
            sx={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 200,
              height: 200,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.05)",
              zIndex: 0,
            }}
          />

          <Stack direction="row" alignItems="center" spacing={2} sx={{ zIndex: 1 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(255,255,255,0.15)",
                border: "2px solid rgba(255,255,255,0.25)",
              }}
            >
              <RestaurantMenuIcon sx={{ fontSize: 36, color: "white" }} />
            </Box>
            <Box>
              <Typography variant="h3" fontWeight={900} sx={{ fontSize: { xs: "1.75rem", sm: "2.5rem" }, color: "white", lineHeight: 1 }}>
                Menu
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5 }}>
                Discover fresh & delicious meals
              </Typography>
            </Box>
          </Stack>
        </Stack>

        {/* Category Tabs + Refresh */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3 },
            mb: 4,
            borderRadius: 3,
            background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
            border: "1px solid #e5e7eb",
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2.5}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Select Category
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
                {categories.map((c) => {
                  const active = category === c.value;
                  return (
                    <Button
                      key={c.value}
                      variant={active ? "contained" : "outlined"}
                      size="small"
                      onClick={() => setCategory(c.value)}
                      sx={{
                        textTransform: "none",
                        borderRadius: 999,
                        px: 2.5,
                        py: 0.9,
                        fontWeight: 800,
                        boxShadow: active ? "0 8px 18px rgba(30,64,175,0.25)" : "none",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      {c.label}
                    </Button>
                  );
                })}
              </Stack>
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", sm: "center" }}>
              {items.length > 0 && (
                <Box
                  sx={{
                    px: 2.5,
                    py: 1,
                    bgcolor: "success.light",
                    borderRadius: 2,
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    boxShadow: "0 4px 12px rgba(34,197,94,0.15)",
                  }}
                >
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "success.dark" }} />
                  {items.length} items available
                </Box>
              )}
              <Button
                variant="outlined"
                onClick={() => fetchItems()}
                disabled={loading}
                sx={{
                  borderColor: "#1d4ed8",
                  color: "#1d4ed8",
                  fontWeight: 800,
                  textTransform: "none",
                  borderRadius: "10px",
                  px: 2.5,
                  py: 1,
                  transition: "all 0.2s ease",
                  marginLeft: "auto",
                  "&:hover": {
                    borderColor: "#0f172a",
                    color: "#0f172a",
                    backgroundColor: "#f0f4ff",
                  },
                }}
              >
                <RefreshIcon />
              </Button>
            </Stack>
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
              borderRadius: 2,
              bgcolor: "#f5f5f5",
              border: "1px solid #e0e0e0",
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
