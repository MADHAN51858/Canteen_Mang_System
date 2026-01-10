import { useState, useEffect } from "react";
import { post } from "../utils/api";
import { Box, Typography, Paper, Grid, Container, ToggleButton, ToggleButtonGroup } from "@mui/material";
import Chart from "react-apexcharts";

export default function Dashboard() {
  const [userStats, setUserStats] = useState({ admin: 0, staff: 0, student: 0 });
  const [foodStats, setFoodStats] = useState({});
  const [walletTotal, setWalletTotal] = useState(0);
  const [dailyStats, setDailyStats] = useState([]);
  const [categoryFoodStats, setCategoryFoodStats] = useState({});
  const [categoryCrossStats, setCategoryCrossStats] = useState({});
  const [categoryRevenueStats, setCategoryRevenueStats] = useState({});
  const [categoryFoodRevenueStats, setCategoryFoodRevenueStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("units");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch all users
      const usersRes = await post("/users/getAllUsers", {});
      if (usersRes.success && Array.isArray(usersRes.data)) {
        const users = usersRes.data;
        const admins = users.filter((u) => u.role === "admin");
        const counts = {
          admin: admins.length,
          staff: users.filter((u) => u.role === "staff").length,
          student: users.filter((u) => u.role === "student").length,
        };
        setUserStats(counts);

        // Show only admin wallet balance total on the admin dashboard
        const totalWallet = admins.reduce(
          (sum, u) => sum + Number(u.walletBalance || 0),
          0
        );
        setWalletTotal(totalWallet);
      }

      // Fetch all food items
      const foodRes = await post("/food/getAllFoods", {});
      if (foodRes.success && Array.isArray(foodRes.data)) {
        const foods = foodRes.data;
        const categories = {};
        foods.forEach((f) => {
          const cat = f.category || "Other";
          categories[cat] = (categories[cat] || 0) + 1;
        });
        setFoodStats(categories);
      }

      // Fetch daily order stats (default 14 days)
      const dailyRes = await post("/order/getDailyOrderStats", { days: 14 });
      if (dailyRes.success && Array.isArray(dailyRes.data)) {
        setDailyStats(dailyRes.data);
      }

      // Fetch category food growth stats
      const catFoodRes = await post("/order/getCategoryFoodStats", { days: 14 });
      if (catFoodRes.success && catFoodRes.data) {
        setCategoryFoodStats(catFoodRes.data);
      }

      // Fetch category cross-comparison stats (Breakfast vs Lunch vs Dinner)
      const catCrossRes = await post("/order/getCategoryCrossStats", { days: 14 });
      if (catCrossRes.success && catCrossRes.data) {
        setCategoryCrossStats(catCrossRes.data);
      }

      // Fetch category revenue stats
      const catRevRes = await post("/order/getCategoryRevenueStats", { days: 14 });
      if (catRevRes.success && catRevRes.data) {
        setCategoryRevenueStats(catRevRes.data);
      }

      // Fetch category food revenue stats
      const catFoodRevRes = await post("/order/getCategoryFoodRevenueStats", { days: 14 });
      if (catFoodRevRes.success && catFoodRevRes.data) {
        setCategoryFoodRevenueStats(catFoodRevRes.data);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={600} mb={4}>
        Admin Dashboard
      </Typography>

      <Grid container spacing={4}>
        {/* Wallet total card */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Typography variant="h6" fontWeight={600} mb={1}>
              Wallet Balance (Total)
            </Typography>
            <Typography variant="h4" fontWeight={700} color="primary">
              ₹{walletTotal.toFixed(2)}
            </Typography>
          </Paper>
        </Grid>

        {/* Users by Role Pie Chart */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Users by Role
            </Typography>
            <Chart
              type="pie"
              series={[userStats.admin, userStats.staff, userStats.student]}
              options={{
                labels: ["Admin", "Staff", "Student"],
                colors: ["#FF6B6B", "#4ECDC4", "#45B7D1"],
                chart: { type: "pie" },
                responsive: [
                  {
                    breakpoint: 480,
                    options: {
                      chart: { width: 200 },
                      legend: { position: "bottom" },
                    },
                  },
                ],
              }}
              height={300}
            />
          </Paper>
        </Grid>

        {/* Food Categories Pie Chart */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Foods by Category
            </Typography>
            <Chart
              type="pie"
              series={Object.values(foodStats)}
              options={{
                labels: Object.keys(foodStats),
                colors: ["#FFE66D", "#95E1D3", "#F38181", "#AA96DA"],
                chart: { type: "pie" },
                responsive: [
                  {
                    breakpoint: 480,
                    options: {
                      chart: { width: 200 },
                      legend: { position: "bottom" },
                    },
                  },
                ],
              }}
              height={300}
            />
          </Paper>
        </Grid>

        {/* Category Comparison Chart (Breakfast vs Lunch vs Dinner) */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={600}>
                Category Comparison (Breakfast vs Lunch vs Dinner) - {filterType === "units" ? "Units Sold" : "Revenue (₹)"}
              </Typography>
              <ToggleButtonGroup
                value={filterType}
                exclusive
                onChange={(e, newFilter) => {
                  if (newFilter !== null) setFilterType(newFilter);
                }}
                size="small"
                sx={{
                  "& .MuiToggleButton-root": {
                    fontWeight: 600,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "rgba(25, 103, 210, 0.12)",
                      color: "#1967d2",
                    },
                    "&.Mui-selected": {
                      backgroundColor: "#1967d2",
                      color: "#fff",
                      fontWeight: 700,
                      "&:hover": {
                        backgroundColor: "#1565c0",
                      },
                    },
                  },
                }}
              >
                <ToggleButton value="units" sx={{ px: 2 }}>
                  📦 Units
                </ToggleButton>
                <ToggleButton value="revenue" sx={{ px: 2 }}>
                  💰 Revenue
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {(filterType === "units" ? Object.keys(categoryCrossStats) : Object.keys(categoryRevenueStats)).length > 0 ? (
              <Chart
                type="bar"
                series={[
                  {
                    name: "BreakFast",
                    data: (filterType === "units" ? Object.keys(categoryCrossStats) : Object.keys(categoryRevenueStats)).map(
                      (d) => (filterType === "units" ? categoryCrossStats[d]["BreakFast"] || 0 : categoryRevenueStats[d]["BreakFast"] || 0)
                    ),
                  },
                  {
                    name: "Lunch",
                    data: (filterType === "units" ? Object.keys(categoryCrossStats) : Object.keys(categoryRevenueStats)).map(
                      (d) => (filterType === "units" ? categoryCrossStats[d]["Lunch"] || 0 : categoryRevenueStats[d]["Lunch"] || 0)
                    ),
                  },
                  {
                    name: "dinner",
                    data: (filterType === "units" ? Object.keys(categoryCrossStats) : Object.keys(categoryRevenueStats)).map(
                      (d) => (filterType === "units" ? categoryCrossStats[d]["dinner"] || 0 : categoryRevenueStats[d]["dinner"] || 0)
                    ),
                  },
                ]}
                options={{
                  xaxis: {
                    categories: filterType === "units" ? Object.keys(categoryCrossStats) : Object.keys(categoryRevenueStats),
                    labels: { rotate: -45 },
                  },
                  dataLabels: { enabled: false },
                  colors: ["#FFB347", "#FF6B6B", "#4ECDC4"],
                  chart: { stacked: false },
                  grid: { strokeDashArray: 4 },
                  tooltip: {
                    theme: "dark",
                    y: {
                      formatter: (val) => filterType === "units" ? `${val} orders` : `₹${val.toFixed(2)}`,
                    },
                    style: {
                      fontSize: "12px",
                      fontFamily: "Arial, sans-serif",
                    },
                  },
                }}
                height={320}
              />
            ) : (
              <Typography color="textSecondary">No category data available</Typography>
            )}
          </Paper>
        </Grid>
        {/* Category Food Growth - Breakfast, Lunch, Dinner */}
        {["BreakFast", "Lunch", "dinner"].map((category) => {
          const dataSource = filterType === "units" ? categoryFoodStats : categoryFoodRevenueStats;
          const foods = dataSource[category] || {};
          const allDates = new Set();
          Object.values(foods).forEach((foodData) => {
            if (Array.isArray(foodData)) {
              foodData.forEach((d) => allDates.add(d.date));
            }
          });
          const sortedDates = Array.from(allDates).sort();

          const series = Object.entries(foods).map(([foodName, foodData]) => {
            const countMap = {};
            if (Array.isArray(foodData)) {
              foodData.forEach((d) => {
                const key = filterType === "units" ? "count" : "revenue";
                countMap[d.date] = d[key];
              });
            }
            return {
              name: foodName.charAt(0).toUpperCase() + foodName.slice(1),
              data: sortedDates.map((date) => countMap[date] ?? 0),
            };
          });

          const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFE66D", "#95E1D3", "#F38181", "#AA96DA", "#FFB6B9"];

          return (
            <Grid item xs={12} md={4} key={category}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  {category} - {filterType === "units" ? "Units Sold" : "Revenue (₹)"}
                </Typography>
                {sortedDates.length > 0 && series.length > 0 ? (
                  <Chart
                    type="bar"
                    series={series}
                    options={{
                      xaxis: {
                        categories: sortedDates,
                        labels: { rotate: -45, fontSize: 10 },
                      },
                      dataLabels: { enabled: false },
                      colors: colors.slice(0, series.length),
                      chart: { stacked: false },
                      grid: { strokeDashArray: 4 },
                      tooltip: {
                        theme: "dark",
                        y: {
                          formatter: (val) => filterType === "units" ? `${val} units` : `₹${val.toFixed(2)}`,
                        },
                        style: {
                          fontSize: "12px",
                          fontFamily: "Arial, sans-serif",
                        },
                      },
                    }}
                    height={280}
                  />
                ) : (
                  <Typography color="textSecondary" variant="body2">
                    No data available
                  </Typography>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
}
