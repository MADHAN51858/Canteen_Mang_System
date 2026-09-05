import { useState, useEffect, useContext } from "react";
import { post } from "../utils/api";
import { CartContext } from "../context/CartContext";
import { useToast } from "../hooks/useToast";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Container,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  Chip,
  Stack,
  TextField,
  Button,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import Chart from "react-apexcharts";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeIcon from "@mui/icons-material/Badge";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";

export default function Dashboard() {
  const { user, login } = useContext(CartContext);
  const { showToast } = useToast();
  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  const [editAdminData, setEditAdminData] = useState({
    email: user?.email || "",
    phoneNo: user?.phoneNo || "",
    rollNo: user?.rollNo || "",
  });
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrowing] = useState(false);
  const [currentWalletBalance, setCurrentWalletBalance] = useState(
    user?.walletBalance || 0
  );
  const [userStats, setUserStats] = useState({
    admin: 0,
    staff: 0,
    student: 0,
  });
  const [foodStats, setFoodStats] = useState({});
  const [orderStats, setOrderStats] = useState({ preOrder: 0, normalOrder: 0 });
  const [orderStatusStats, setOrderStatusStats] = useState({
    pending: 0,
    preparing: 0,
    completed: 0,
    cancelled: 0,
  });
  const [walletTotal, setWalletTotal] = useState(0);
  const [dailyStats, setDailyStats] = useState([]);
  const [categoryFoodStats, setCategoryFoodStats] = useState({});
  const [categoryCrossStats, setCategoryCrossStats] = useState({});
  const [categoryRevenueStats, setCategoryRevenueStats] = useState({});
  const [categoryFoodRevenueStats, setCategoryFoodRevenueStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("units");

  useEffect(() => {
    if (user) {
      setEditAdminData({
        email: user.email || "",
        phoneNo: user.phoneNo || "",
        rollNo: user.rollNo || "",
      });
      setCurrentWalletBalance(user.walletBalance || 0);
    }
  }, [user]);

  const handleSaveAdminDetails = async () => {
    // Validate before saving
    if (!editAdminData.email?.trim()) {
      showToast("Email is required", "error");
      return;
    }

    if (!editAdminData.rollNo?.trim()) {
      showToast("Roll Number is required", "error");
      return;
    }

    const phoneStr = String(editAdminData.phoneNo || "").replace(/\D/g, "");
    if (phoneStr.length !== 10) {
      showToast("Phone number must be exactly 10 digits", "error");
      return;
    }

    setSavingAdmin(true);
    try {
      // Ensure all fields are present and properly formatted
      const payload = {
        username: user.username,
        email: editAdminData.email.trim(),
        phoneNo: phoneStr,
        rollNo: editAdminData.rollNo.trim(),
      };

      console.log("Sending update payload:", payload);

      const response = await post("/users/updateProfile", payload);

      console.log("Update response:", response);

      if (response.success) {
        showToast("Admin details updated successfully", "success");
        setIsEditingAdmin(false);
        // Update user context with new data
        const updatedUser = response.data?.user || {
          ...user,
          email: payload.email,
          phoneNo: parseInt(phoneStr, 10),
          rollNo: payload.rollNo,
        };
        login(updatedUser);
      } else {
        showToast(response.message || "Failed to update details", "error");
      }
    } catch (err) {
      console.error("Update error:", err);
      showToast(
        "Error updating admin details: " +
          (err.response?.data?.message || err.message),
        "error"
      );
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleCancelEdit = () => {
    setEditAdminData({
      email: user?.email || "",
      phoneNo: user?.phoneNo || "",
      rollNo: user?.rollNo || "",
    });
    setIsEditingAdmin(false);
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (amount > (currentWalletBalance || 0)) {
      showToast("Insufficient balance", "error");
      return;
    }

    setWithdrowing(true);
    try {
      const response = await post("/users/withdrawAmount", {
        userId: user._id,
        amount: amount,
      });

      if (response?.success) {
        // Get the new balance from response
        const newBalance = response.data?.newBalance;
        console.log(
          "Withdrawal successful. New balance from server:",
          newBalance
        );

        if (newBalance !== undefined && newBalance !== null) {
          console.log(
            "Updating local state from:",
            currentWalletBalance,
            "to:",
            newBalance
          );

          // Update local state immediately for instant UI update
          setCurrentWalletBalance(newBalance);

          // Update user in context with new balance
          const updatedUser = {
            ...user,
            walletBalance: newBalance,
          };

          // Update CartContext to persist changes
          login(updatedUser);

          // Update wallet total by deducting the withdrawn amount
          setWalletTotal((prev) => Math.max(0, prev - amount));

          showToast(`Successfully withdrawn ₹${amount.toFixed(2)}`, "success");
          setWithdrawDialog(false);
          setWithdrawAmount("");
        } else {
          showToast("Withdrawal processed but balance not updated", "warning");
        }
      } else {
        showToast(response?.message || "Withdrawal failed", "error");
      }
    } catch (err) {
      showToast("Error processing withdrawal: " + err.message, "error");
    } finally {
      setWithdrowing(false);
    }
  };

  const handleCancelWithdraw = () => {
    setWithdrawDialog(false);
    setWithdrawAmount("");
  };

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
      const catFoodRes = await post("/order/getCategoryFoodStats", {
        days: 14,
      });
      if (catFoodRes.success && catFoodRes.data) {
        setCategoryFoodStats(catFoodRes.data);
      }

      // Fetch category cross-comparison stats (Breakfast vs Lunch vs Dinner)
      const catCrossRes = await post("/order/getCategoryCrossStats", {
        days: 14,
      });
      if (catCrossRes.success && catCrossRes.data) {
        setCategoryCrossStats(catCrossRes.data);
      }

      // Fetch category revenue stats
      const catRevRes = await post("/order/getCategoryRevenueStats", {
        days: 14,
      });
      if (catRevRes.success && catRevRes.data) {
        setCategoryRevenueStats(catRevRes.data);
      }

      // Fetch category food revenue stats
      const catFoodRevRes = await post("/order/getCategoryFoodRevenueStats", {
        days: 14,
      });
      if (catFoodRevRes.success && catFoodRevRes.data) {
        setCategoryFoodRevenueStats(catFoodRevRes.data);
      }

      // Fetch pre-order vs normal order stats
      const orderStatsRes = await post("/order/getOrderStats", {});
      if (orderStatsRes.success && orderStatsRes.data) {
        setOrderStats(orderStatsRes.data);
      }

      // Fetch order status stats
      const orderStatusRes = await post("/order/getOrderStatusStats", {});
      if (orderStatusRes.success && orderStatusRes.data) {
        setOrderStatusStats(orderStatusRes.data);
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
        <Grid container spacing={3} >
          {/* Profile Skeleton */}
          <Grid item xs={12} width="100%">
            <Card
              sx={{
                borderRadius: 3,
                p: 3,
                background: "linear-gradient(135deg, #1e40af, #3b82f6)",
                color: "white",
                boxShadow: "0 12px 40px rgba(30,64,175,0.2)",
                width: "100%",
              }}
            >
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Skeleton
                      variant="circular"
                      width={72}
                      height={72}
                      sx={{ bgcolor: "rgba(255,255,255,0.2)" }}
                    />
                    <Stack spacing={1} sx={{ flex: 1 }}>
                      <Skeleton
                        variant="text"
                        width={200}
                        height={28}
                        sx={{ bgcolor: "rgba(255,255,255,0.25)" }}
                      />
                      <Skeleton
                        variant="text"
                        width={140}
                        height={20}
                        sx={{ bgcolor: "rgba(255,255,255,0.2)" }}
                      />
                    </Stack>
                  </Stack>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Stack spacing={1.5} sx={{ width: "100%" }}>
                    <Skeleton
                      variant="rectangular"
                      width="100%"
                      height={32}
                      sx={{ borderRadius: 2, bgcolor: "rgba(255,255,255,0.2)" }}
                    />
                    <Skeleton
                      variant="rectangular"
                      width="100%"
                      height={32}
                      sx={{ borderRadius: 2, bgcolor: "rgba(255,255,255,0.2)" }}
                    />
                    <Skeleton
                      variant="rectangular"
                      width="100%"
                      height={32}
                      sx={{ borderRadius: 2, bgcolor: "rgba(255,255,255,0.2)" }}
                    />
                  </Stack>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Stack spacing={1.5} sx={{ width: "100%" }}>
                    <Skeleton
                      variant="rectangular"
                      width="100%"
                      height={44}
                      sx={{ borderRadius: 2, bgcolor: "rgba(255,255,255,0.2)" }}
                    />
                    <Skeleton
                      variant="rectangular"
                      width="100%"
                      height={44}
                      sx={{ borderRadius: 2, bgcolor: "rgba(255,255,255,0.2)" }}
                    />
                  </Stack>
                </Grid>
              </Grid>
            </Card>
          </Grid>

          {/* Stat Cards Skeletons */}
          {Array.from({ length: 5 }).map((_, idx) => (
            <Grid item xs={12} sm={6} md={4} key={`stat-skel-${idx}`}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: "white",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              >
                <Skeleton variant="text" width={120} height={20} sx={{ mb: 1 }} />
                <Skeleton variant="text" width={80} height={32} />
                <Skeleton
                  variant="rectangular"
                  width="100%"
                  height={8}
                  sx={{ mt: 2, borderRadius: 10 }}
                />
              </Paper>
            </Grid>
          ))}

          {/* Section Title Skeleton */}
          <Grid item xs={12} sx={{ my: 10 }}>
          </Grid>

          {/* Pie Charts Skeletons */}
          {Array.from({ length: 4 }).map((_, idx) => (
            <Grid item xs={12} md={4} key={`pie-skel-${idx}`}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: "white",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  minHeight: 340,
                }}
              >
                <Skeleton variant="text" width={200} height={24} sx={{ mb: 2 }} />
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 260,
                  }}
                >
                  <Skeleton
                    variant="circular"
                    width={200}
                    height={200}
                    sx={{ borderRadius: "50%" }}
                  />
                </Box>
              </Paper>
            </Grid>
          ))}

          {/* Toggle buttons skeleton */}
          {/* <Grid item xs={12}>
            <Stack direction="row" spacing={2}>
              <Skeleton variant="rectangular" width={140} height={40} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rectangular" width={160} height={40} sx={{ borderRadius: 2 }} />
            </Stack>
          </Grid> */}

          {/* Full Width Comparison Chart Skeleton */}
          {/* <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                bgcolor: "white",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                minHeight: 360,
              }}
            >
              <Skeleton variant="text" width={260} height={26} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" width="100%" height={280} sx={{ borderRadius: 2 }} />
            </Paper>
          </Grid> */}

          {/* Category Growth Charts Skeletons */}
          {Array.from({ length: 4 }).map((_, idx) => (
            <Grid item xs={12} md={4} key={`growth-skel-${idx}`}>
              <Paper
                elevation={0}
                sx={{
                  mt: 3,
                  p: 3.8,
                  borderRadius: 2,
                  bgcolor: "white",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  minHeight: 320,
                }}
              >
                <Skeleton variant="text" width={180} height={24} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" width="100%" height={240} sx={{ borderRadius: 2 }} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Admin Profile Card */}
      {user && (
        <Card
          sx={{
            borderRadius: 3,
            p: 3,
            mb: 4,
            background: "linear-gradient(135deg, #1e40af, #3b82f6)",
            color: "white",
            border: "none",
            boxShadow: "0 12px 40px rgba(30,64,175,0.3)",
          }}
        >
          <Grid
            container
            spacing={3}
            alignItems="center"
            justifyContent="space-between"
          >
            <Grid item xs={12} sm={4}>
              <Stack spacing={2} sx={{ alignItems: "center" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 2,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "rgba(255,255,255,0.15)",
                      border: "2px solid rgba(255,255,255,0.3)",
                    }}
                  >
                    <PersonIcon sx={{ fontSize: 40 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                      {user.username}
                    </Typography>
                    <Chip
                      label="ADMIN"
                      size="small"
                      sx={{
                        bgcolor: "rgba(255,255,255,0.25)",
                        color: "white",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                      }}
                    />
                  </Box>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Grid container spacing={2}>
                {/* Email */}
                <Grid item xs={12} sm={6}>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1.5,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <EmailIcon
                      sx={{
                        color: "rgba(255,255,255,0.9)",
                        flexShrink: 0,
                        mt: isEditingAdmin ? 0.5 : 0.25,
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.8)",
                          display: "block",
                          mb: 0.25,
                          fontWeight: 600,
                        }}
                      >
                        Email
                      </Typography>
                      {isEditingAdmin ? (
                        <TextField
                          size="small"
                          value={editAdminData.email}
                          onChange={(e) =>
                            setEditAdminData({
                              ...editAdminData,
                              email: e.target.value,
                            })
                          }
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              color: "white",
                              "& fieldset": {
                                borderColor: "rgba(255,255,255,0.3)",
                              },
                              "&:hover fieldset": {
                                borderColor: "rgba(255,255,255,0.5)",
                              },
                            },
                            width: "100%",
                          }}
                        />
                      ) : (
                        <Typography
                          sx={{
                            color: "white",
                            fontSize: "0.9rem",
                            fontWeight: 500,
                            wordBreak: "break-all",
                          }}
                        >
                          {user.email}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>

                {/* Roll No */}
                <Grid item xs={12} sm={6}>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1.5,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <BadgeIcon
                      sx={{
                        color: "rgba(255,255,255,0.9)",
                        flexShrink: 0,
                        mt: isEditingAdmin ? 0.5 : 0.25,
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.8)",
                          display: "block",
                          mb: 0.25,
                          fontWeight: 600,
                        }}
                      >
                        Roll Number
                      </Typography>
                      {isEditingAdmin ? (
                        <TextField
                          size="small"
                          value={editAdminData.rollNo}
                          onChange={(e) =>
                            setEditAdminData({
                              ...editAdminData,
                              rollNo: e.target.value,
                            })
                          }
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              color: "white",
                              "& fieldset": {
                                borderColor: "rgba(255,255,255,0.3)",
                              },
                              "&:hover fieldset": {
                                borderColor: "rgba(255,255,255,0.5)",
                              },
                            },
                            width: "100%",
                          }}
                        />
                      ) : (
                        <Typography
                          sx={{
                            color: "white",
                            fontSize: "0.9rem",
                            fontWeight: 600,
                          }}
                        >
                          {user.rollNo || "—"}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>

                {/* Phone */}
                <Grid item xs={12} sm={6}>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1.5,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <PhoneIcon
                      sx={{
                        color: "rgba(255,255,255,0.9)",
                        flexShrink: 0,
                        mt: isEditingAdmin ? 0.5 : 0.25,
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.8)",
                          display: "block",
                          mb: 0.25,
                          fontWeight: 600,
                        }}
                      >
                        Phone
                      </Typography>
                      {isEditingAdmin ? (
                        <TextField
                          size="small"
                          value={editAdminData.phoneNo}
                          onChange={(e) =>
                            setEditAdminData({
                              ...editAdminData,
                              phoneNo: e.target.value,
                            })
                          }
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              color: "white",
                              "& fieldset": {
                                borderColor: "rgba(255,255,255,0.3)",
                              },
                              "&:hover fieldset": {
                                borderColor: "rgba(255,255,255,0.5)",
                              },
                            },
                            width: "100%",
                          }}
                        />
                      ) : (
                        <Typography
                          sx={{
                            color: "white",
                            fontSize: "0.9rem",
                            fontWeight: 500,
                          }}
                        >
                          {user.phoneNo || "—"}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Grid>

            {/* Right side - Action buttons */}
            <Grid item xs={12} sm={4}>
              <Stack spacing={1.5} sx={{ justifyContent: "flex-start" }}>
                {!isEditingAdmin ? (
                  <>
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      startIcon={<EditIcon />}
                      onClick={() => setIsEditingAdmin(true)}
                      sx={{
                        bgcolor: "#3b82f6",
                        color: "white",
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        py: 1,
                        boxShadow: "0 8px 20px rgba(59,130,246,0.35)",
                        "&:hover": {
                          bgcolor: "#1e40af",
                          boxShadow: "0 12px 28px rgba(59,130,246,0.45)",
                        },
                      }}
                    >
                      Edit Details
                    </Button>

                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      startIcon={<MoneyOffIcon />}
                      onClick={() => setWithdrawDialog(true)}
                      disabled={(user?.walletBalance || 0) === 0}
                      sx={{
                        bgcolor: "#10b981",
                        color: "white",
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        py: 1,
                        boxShadow: "0 8px 20px rgba(16,185,129,0.35)",
                        "&:hover:not(:disabled)": {
                          bgcolor: "#059669",
                          boxShadow: "0 12px 28px rgba(16,185,129,0.45)",
                        },
                        "&:disabled": {
                          bgcolor: "#6ee7b7",
                          opacity: 0.6,
                        },
                      }}
                    >
                      Withdraw
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      startIcon={<SaveIcon />}
                      onClick={handleSaveAdminDetails}
                      disabled={savingAdmin}
                      sx={{
                        bgcolor: "#10b981",
                        color: "white",
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        py: 1,
                        boxShadow: "0 8px 20px rgba(16,185,129,0.35)",
                        "&:hover:not(:disabled)": {
                          bgcolor: "#059669",
                          boxShadow: "0 12px 28px rgba(16,185,129,0.45)",
                        },
                        "&:disabled": {
                          opacity: 0.6,
                        },
                      }}
                    >
                      {savingAdmin ? "Saving..." : "Save Changes"}
                    </Button>

                    <Button
                      variant="outlined"
                      size="large"
                      fullWidth
                      startIcon={<CancelIcon />}
                      onClick={handleCancelEdit}
                      disabled={savingAdmin}
                      sx={{
                        borderColor: "rgba(255,255,255,0.5)",
                        color: "white",
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        py: 1,
                        "&:hover": {
                          borderColor: "white",
                          bgcolor: "rgba(255,255,255,0.1)",
                        },
                        "&:disabled": {
                          opacity: 0.6,
                        },
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* Withdraw Dialog - continue with existing code */}
      <Dialog
        open={withdrawDialog}
        onClose={() => !withdrawing && setWithdrawDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Withdraw Amount</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Current Balance: ₹{(currentWalletBalance || 0).toFixed(2)}
            </Typography>
            <TextField
              label="Withdraw Amount"
              type="number"
              fullWidth
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              disabled={withdrawing}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setWithdrawDialog(false)}
            disabled={withdrawing}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleWithdraw}
            disabled={withdrawing || !withdrawAmount}
            sx={{
              bgcolor: "#10b981",
              "&:hover": { bgcolor: "#059669" },
            }}
          >
            {withdrawing ? "Processing..." : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stats Grid - keeping the rest of the page intact */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: "#f0f9ff",
              border: "1px solid #bfdbfe",
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Total Admins
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#1e40af" }}>
              {userStats.admin}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: "#fef3c7",
              border: "1px solid #fcd34d",
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Total Staff
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#d97706" }}>
              {userStats.staff}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: "#dcfce7",
              border: "1px solid #86efac",
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Total Students
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#16a34a" }}>
              {userStats.student}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: "#ede9fe",
              border: "1px solid #d8b4fe",
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Admin Wallet Total
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#7c3aed" }}>
              ₹{walletTotal.toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Typography variant="h4" fontWeight={600} mb={4} sx={{ mt: 4 }}>
        Statistics & Analytics
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Food Categories Pie Chart */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              borderRadius: 3,
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography
              variant="h6"
              fontWeight={700}
              mb={3}
              sx={{ color: "#333" }}
            >
              Food Items by Category
            </Typography>
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Chart
                type="pie"
                series={Object.values(foodStats)}
                options={{
                  labels: Object.keys(foodStats),
                  colors: ["#667eea", "#764ba2", "#f093fb", "#f5576c"],
                  chart: {
                    type: "pie",
                  },
                  legend: {
                    position: "bottom",
                  },
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
                height={320}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Order Type Distribution */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              borderRadius: 3,
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography
              variant="h6"
              fontWeight={700}
              mb={3}
              sx={{ color: "#333" }}
            >
              Order Type Distribution
            </Typography>
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Chart
                type="pie"
                series={[orderStats.preOrder || 0, orderStats.normalOrder || 0]}
                options={{
                  labels: ["Pre-Orders", "Normal Orders"],
                  colors: ["#667eea", "#764ba2"],
                  chart: {
                    type: "pie",
                  },
                  legend: {
                    position: "bottom",
                  },
                  dataLabels: {
                    formatter: (val) => `${val.toFixed(1)}%`,
                  },
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
                height={320}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Order Status Distribution */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              borderRadius: 3,
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography
              variant="h6"
              fontWeight={700}
              mb={3}
              sx={{ color: "#333" }}
            >
              Order Status Distribution
            </Typography>
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Chart
                type="pie"
                series={[
                  orderStatusStats.pending || 0,
                  orderStatusStats.preparing || 0,
                  orderStatusStats.completed || 0,
                  orderStatusStats.cancelled || 0,
                ]}
                options={{
                  labels: ["Pending", "Preparing", "Completed", "Cancelled"],
                  colors: [ "#3b82f6", "#f59e0b","#10b981", "#ef4444"],
                  chart: {
                    type: "pie",
                  },
                  legend: {
                    position: "bottom",
                  },
                  dataLabels: {
                    formatter: (val) => `${val.toFixed(1)}%`,
                  },
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
                height={320}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
      <ToggleButtonGroup
        value={filterType}
        exclusive
        onChange={(e, newFilter) => {
          if (newFilter !== null) setFilterType(newFilter);
        }}
        size="small"
        sx={{
          mb: 3,
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
          Units Sold
        </ToggleButton>
        <ToggleButton value="revenue" sx={{ px: 2 }}>
          Revenue Generated
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Category Comparison Chart - Full Width */}
      <Grid container spacing={3} sx={{ mb: 4 }} md={12}>
        <Grid item xs={12} md={12} sx={{width: "95%"}}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              borderRadius: 3,
              height: "100%",
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={3}
            >
              <Typography variant="h6" fontWeight={700} sx={{ color: "#333" }}>
                Compare Category wise Sales
              </Typography>
            </Box>
            {(filterType === "units"
              ? Object.keys(categoryCrossStats)
              : Object.keys(categoryRevenueStats)
            ).length > 0 ? (
              <Chart
                type="bar"
                series={[
                  {
                    name: "Breakfast",
                    data: (filterType === "units"
                      ? Object.keys(categoryCrossStats)
                      : Object.keys(categoryRevenueStats)
                    ).map((d) =>
                      filterType === "units"
                        ? categoryCrossStats[d]["BreakFast"] || 0
                        : categoryRevenueStats[d]["BreakFast"] || 0
                    ),
                  },
                  {
                    name: "Lunch",
                    data: (filterType === "units"
                      ? Object.keys(categoryCrossStats)
                      : Object.keys(categoryRevenueStats)
                    ).map((d) =>
                      filterType === "units"
                        ? categoryCrossStats[d]["Lunch"] || 0
                        : categoryRevenueStats[d]["Lunch"] || 0
                    ),
                  },
                  {
                    name: "Dinner",
                    data: (filterType === "units"
                      ? Object.keys(categoryCrossStats)
                      : Object.keys(categoryRevenueStats)
                    ).map((d) =>
                      filterType === "units"
                        ? categoryCrossStats[d]["dinner"] || 0
                        : categoryRevenueStats[d]["dinner"] || 0
                    ),
                  },
                ]}
                options={{
                  chart: {
                    stacked: false,
                    toolbar: {
                      show: false,
                    },
                  },
                  xaxis: {
                    categories:
                      filterType === "units"
                        ? Object.keys(categoryCrossStats)
                        : Object.keys(categoryRevenueStats),
                    labels: {
                      rotate: -45,
                      style: {
                        colors: "#333",
                      },
                    },
                  },
                  yaxis: {
                    labels: {
                      style: {
                        colors: "#333",
                      },
                    },
                  },
                  dataLabels: { enabled: false },
                  colors: ["#667eea", "#764ba2", "#f093fb"],
                  grid: {
                    strokeDashArray: 4,
                  },
                  tooltip: {
                    theme: "light",
                    y: {
                      formatter: (val) =>
                        filterType === "units"
                          ? `${val} orders`
                          : `₹${val.toFixed(2)}`,
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
              <Box
                sx={{
                  height: 320,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography sx={{ color: "#999" }}>
                  No category data available
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Category Food Growth - Breakfast, Lunch, Dinner */}
        {(() => {
          const dataSource =
            filterType === "units"
              ? categoryFoodStats
              : categoryFoodRevenueStats;

          // Calculate common dates across all categories
          const allDatesSet = new Set();
          ["BreakFast", "Lunch", "dinner"].forEach((cat) => {
            const foods = dataSource[cat] || {};
            Object.values(foods).forEach((foodData) => {
              if (Array.isArray(foodData)) {
                foodData.forEach((d) => allDatesSet.add(d.date));
              }
            });
          });
          const commonDates = Array.from(allDatesSet).sort();

          // Calculate max value across all categories for consistent y-axis
          let maxValue = 0;
          ["BreakFast", "Lunch", "dinner"].forEach((cat) => {
            const foods = dataSource[cat] || {};
            Object.values(foods).forEach((foodData) => {
              if (Array.isArray(foodData)) {
                foodData.forEach((d) => {
                  const key = filterType === "units" ? "count" : "revenue";
                  maxValue = Math.max(maxValue, d[key] || 0);
                });
              }
            });
          });


          const categoryEmojis = {
            BreakFast: "🌅",
            Lunch: "🍽️",
            dinner: "🌙",
          };

          return ["BreakFast", "Lunch", "dinner"].map((category) => {
            const foods = dataSource[category] || {};

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
                data: commonDates.map((date) => countMap[date] ?? 0),
              };
            });

            const colors = [
              "#667eea",
              "#764ba2",
              "#f093fb",
              "#f5576c",
              "#4c63d2",
              "#bc34a6",
              "#a8edea",
              "#fed6e3",
            ];

            return (
              <Grid item xs={12} md={4} key={category}>
                <Paper
                  elevation={3}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    height: "100%",
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    mb={3}
                    sx={{ color: "#333" }}
                  >
                    {categoryEmojis[category]} {category}
                  </Typography>
                  <Chart
                    type="bar"
                    series={
                      series.length > 0
                        ? series
                        : [{ name: "No Data", data: [] }]
                    }
                    options={{
                      chart: {
                        stacked: false,
                        toolbar: {
                          show: false,
                        },
                      },
                      xaxis: {
                        categories: commonDates.length > 0 ? commonDates : [],
                        labels: {
                          rotate: -45,
                          fontSize: 10,
                          style: {
                            colors: "#333",
                          },
                        },
                      },
                      yaxis: {
                        min: 0,
                        max: maxValue > 0 ? Math.ceil(maxValue * 1.1) : 10,
                        labels: {
                          style: {
                            colors: "#333",
                          },
                        },
                      },
                      dataLabels: { enabled: false },
                      colors: colors.slice(0, series.length),
                      grid: {
                        strokeDashArray: 4,
                      },
                      legend: {
                        labels: {},
                      },
                      tooltip: {
                        theme: "light",
                        y: {
                          formatter: (val) =>
                            filterType === "units"
                              ? `${val} units`
                              : `₹${val.toFixed(2)}`,
                        },
                        style: {
                          fontSize: "12px",
                          fontFamily: "Arial, sans-serif",
                        },
                      },
                      noData: {
                        text: "No data available",
                        align: "center",
                        verticalAlign: "middle",
                        style: {
                          color: "#999",
                          fontSize: "14px",
                        },
                      },
                    }}
                    height={280}
                  />
                </Paper>
              </Grid>
            );
          });
        })()}
      </Grid>

      {/* Withdraw Dialog */}
      <Dialog
        open={withdrawDialog}
        onClose={handleCancelWithdraw}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.25rem" }}>
          Withdraw Amount
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body2" sx={{ mb: 2, color: "#64748b" }}>
            Current Balance:{" "}
            <strong sx={{ color: "#1e40af" }}>
              ₹{(user?.walletBalance || 0).toFixed(2)}
            </strong>
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Amount to Withdraw (₹)"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
          {withdrawAmount &&
            parseFloat(withdrawAmount) > (user?.walletBalance || 0) && (
              <Typography
                variant="caption"
                sx={{ color: "#dc2626", display: "block", mt: 1 }}
              >
                Insufficient balance
              </Typography>
            )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={handleCancelWithdraw}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleWithdraw}
            disabled={
              withdrawing ||
              !withdrawAmount ||
              parseFloat(withdrawAmount) <= 0 ||
              parseFloat(withdrawAmount) > (user?.walletBalance || 0)
            }
            sx={{
              textTransform: "none",
              fontWeight: 700,
              bgcolor: "#10b981",
              "&:hover": {
                bgcolor: "#059669",
              },
            }}
          >
            {withdrawing ? "Processing..." : "Withdraw"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
