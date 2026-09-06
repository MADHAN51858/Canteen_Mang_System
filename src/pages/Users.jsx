import { useState, useEffect, useMemo, useContext } from "react";
import { post } from "../utils/api";
import { useToast } from "../hooks/useToast";
import { CartContext } from "../context/CartContext";
import {
  Box,
  Stack,
  Typography,
  Button,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  InputAdornment,
  IconButton,
  Checkbox,
  Tooltip,
  TableSortLabel,
  TablePagination,
  Menu,
  MenuItem,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

// Mathematical cubic Bezier sparkline path from real data points (matching Orders.jsx)
function generateSparklinePaths(dataPoints = []) {
  const points = Array.isArray(dataPoints) ? dataPoints.map((v) => Number(v) || 0) : [];

  if (points.length === 0 || points.every((v) => v === 0)) {
    return {
      pathData: "M 0 38 L 100 38",
      areaData: "M 0 38 L 100 38 L 100 46 L 0 46 Z",
    };
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min === 0 ? 1 : max - min;
  const len = points.length;

  const coords = points.map((val, idx) => {
    const x = len === 1 ? 50 : (idx / (len - 1)) * 100;
    const y = 38 - ((val - min) / range) * 26;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  if (coords.length === 1) {
    return {
      pathData: `M 0 ${coords[0].y} L 100 ${coords[0].y}`,
      areaData: `M 0 ${coords[0].y} L 100 ${coords[0].y} L 100 46 L 0 46 Z`,
    };
  }

  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const cpx = Number(((p0.x + p1.x) / 2).toFixed(1));
    pathD += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  return {
    pathData: pathD,
    areaData: `${pathD} L 100 46 L 0 46 Z`,
  };
}

// Sparkline Summary Card Component (matching Orders.jsx)
function SparklineCard({ title, value, strokeColor, fillColor, gradientId, pathData, areaData, loading }) {
  return (
    <Box
      sx={{
        backgroundColor: "#ffffff",
        borderRadius: "14px",
        p: { xs: 2, sm: 2.2 },
        border: "1px solid #eef2f6",
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 82,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          transform: "translateY(-1px)",
        },
      }}
    >
      <Box>
        <Typography sx={{ color: "#64748b", fontSize: "0.82rem", fontWeight: 600, mb: 0.3 }}>
          {title}
        </Typography>
        {loading ? (
          <Skeleton variant="text" width={55} height={30} />
        ) : (
          <Typography
            sx={{
              color: "#0f172a",
              fontSize: { xs: "1.35rem", sm: "1.55rem" },
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            {value}
          </Typography>
        )}
      </Box>
      <Box sx={{ width: 92, height: 42 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 46" fill="none" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={fillColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaData} fill={`url(#${gradientId})`} />
          <path d={pathData} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Box>
    </Box>
  );
}

// Created Date Formatter (e.g. "Aug 1, 2024")
function formatCreatedDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function Users() {
  const { user: currentUser } = useContext(CartContext);
  const { showToast } = useToast();

  const isAdmin = String(currentUser?.role || "").toLowerCase() === "admin";
  const isUserBlocked = (u) =>
    u?.status === "blocked" || u?.status === "block" || Boolean(u?.blocked);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // Active Tab: 'all' | 'student' | 'staff' | 'blocked' (No Admin tab)
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Sorting
  const [orderBy, setOrderBy] = useState("username");
  const [order, setOrder] = useState("asc");

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Role Menu Anchor for single user
  const [roleMenuAnchor, setRoleMenuAnchor] = useState(null);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);

  // Dialogs
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    userId: null,
    username: "",
  });
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Fetch Users Routine
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await post("/users/getAllUsers", {});

      if (response.success) {
        const all = response.data || [];
        // Hide permanent super-admins (role admin with previousRole also admin)
        const visible = all.filter(
          (u) => !(u.role === "admin" && u.previousRole === "admin")
        );
        setUsers(visible);
      } else {
        showToast(response.message || "Failed to fetch users", "error");
      }
    } catch (err) {
      showToast("Error fetching users: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Filtered Users (All, Students, Staff, Blocked)
  const filteredUsers = useMemo(() => {
    let result = users;

    if (activeTab === "blocked") {
      result = result.filter((u) => isUserBlocked(u));
    } else if (activeTab !== "all") {
      result = result.filter((u) => String(u.role || "").toLowerCase() === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const rollMatch = q.match(/^1db23cs(\d+)$/i);
      const paddedVariant = rollMatch
        ? `1db23cs${String(parseInt(rollMatch[1], 10)).padStart(3, "0")}`
        : null;
      const unpaddedVariant = rollMatch
        ? `1db23cs${parseInt(rollMatch[1], 10)}`
        : null;

      result = result.filter(
        (u) =>
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          String(u.phoneNo || "").toLowerCase().includes(q) ||
          String(u.rollNo || "").toLowerCase().includes(q) ||
          (paddedVariant &&
            (u.rollNo?.toLowerCase() === paddedVariant ||
              u.username?.toLowerCase() === paddedVariant)) ||
          (unpaddedVariant &&
            (u.rollNo?.toLowerCase() === unpaddedVariant ||
              u.username?.toLowerCase() === unpaddedVariant))
      );
    }
    return result;
  }, [users, activeTab, searchQuery]);

  // Sorted Users
  const sortedUsers = useMemo(() => {
    if (!orderBy) return filteredUsers;
    return [...filteredUsers].sort((a, b) => {
      let aVal = a[orderBy];
      let bVal = b[orderBy];

      if (orderBy === "username") {
        aVal = (a.username || "").toLowerCase();
        bVal = (b.username || "").toLowerCase();
      } else if (orderBy === "rollNo") {
        aVal = String(a.rollNo || "").toLowerCase();
        bVal = String(b.rollNo || "").toLowerCase();
        const aNum = parseFloat(a.rollNo);
        const bNum = parseFloat(b.rollNo);
        if (
          !isNaN(aNum) &&
          !isNaN(bNum) &&
          String(aNum) === String(a.rollNo).trim() &&
          String(bNum) === String(b.rollNo).trim()
        ) {
          return order === "asc" ? aNum - bNum : bNum - aNum;
        }
      } else if (orderBy === "role") {
        aVal = (a.role || "").toLowerCase();
        bVal = (b.role || "").toLowerCase();
      } else if (orderBy === "blocked" || orderBy === "status") {
        const isBlockedA = isUserBlocked(a);
        const isBlockedB = isUserBlocked(b);
        aVal = isBlockedA ? 1 : 0;
        bVal = isBlockedB ? 1 : 0;
        return order === "asc" ? aVal - bVal : bVal - aVal;
      } else if (orderBy === "createdAt") {
        aVal = new Date(a.createdAt || 0).getTime();
        bVal = new Date(b.createdAt || 0).getTime();
      }

      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, orderBy, order]);

  // Paginated Users
  const paginatedUsers = useMemo(() => {
    return sortedUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedUsers, page, rowsPerPage]);

  // Top Summary Statistics & Sparklines
  const stats = useMemo(() => {
    const total = users.length;
    const students = users.filter((u) => (u.role || "").toLowerCase() === "student").length;
    const staff = users.filter((u) => (u.role || "").toLowerCase() === "staff").length;
    const blocked = users.filter((u) => isUserBlocked(u)).length;

    return {
      total,
      students,
      staff,
      blocked,
      totalSvg: generateSparklinePaths([10, 18, 25, 34, 45, 60, total || 50]),
      studentsSvg: generateSparklinePaths([8, 15, 20, 28, 38, 52, students || 40]),
      staffSvg: generateSparklinePaths([2, 3, 4, 6, 7, 8, staff || 10]),
      blockedSvg: generateSparklinePaths([1, 2, 1, 3, 2, 4, blocked || 2]),
    };
  }, [users]);

  // Action Handlers
  const handleUpdateRole = async (userId, username, newRole) => {
    try {
      setUpdatingId(userId);
      const response = await post("/users/updateRole", { userId, newRole });

      if (response.success) {
        const updated = response.data;
        setUsers((prev) => prev.map((u) => (u._id === userId ? updated : u)));
        showToast(`Role updated to ${newRole}`, "success");
      } else {
        showToast(response.message || "Failed to update role", "error");
      }
    } catch (err) {
      showToast("Error updating role: " + err.message, "error");
    } finally {
      setUpdatingId(null);
      setRoleMenuAnchor(null);
      setSelectedUserForRole(null);
    }
  };

  // Toggle Block Handler
  const handleToggleBlock = async (userId) => {
    if (!isAdmin) return;
    try {
      setUpdatingId(userId);
      const response = await post("/users/toggleBlockUser", { userId });

      if (response.success) {
        const updated = response.data;
        setUsers((prev) => prev.map((u) => (u._id === userId ? updated : u)));
        const isBlocked = isUserBlocked(updated);
        showToast(`User status set to ${isBlocked ? "Blocked" : "Unblock"}`, "success");
      } else {
        showToast(response.message || "Failed to update status", "error");
      }
    } catch (err) {
      showToast("Error updating status: " + err.message, "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const performDelete = async () => {
    const { userId } = deleteDialog;
    setDeleteDialog({ open: false, userId: null, username: "" });

    try {
      setUpdatingId(userId);
      const response = await post("/users/deleteUser", { userId });

      if (response.success) {
        setUsers((prev) => prev.filter((u) => u._id !== userId));
        showToast("User deleted successfully", "success");
      } else {
        showToast(response.message || "Failed to delete user", "error");
      }
    } catch (err) {
      showToast("Error deleting user: " + err.message, "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedUsers.map((u) => u._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const performBulkDelete = async () => {
    const idsToDelete = [...selectedIds];
    setBulkDeleteDialog(false);
    setSelectedIds([]);

    let count = 0;
    for (const userId of idsToDelete) {
      try {
        const response = await post("/users/deleteUser", { userId });
        if (response.success) {
          setUsers((prev) => prev.filter((u) => u._id !== userId));
          count++;
        }
      } catch (err) {
        showToast("Error deleting user: " + err.message, "error");
      }
    }
    if (count > 0) {
      showToast(`${count} user(s) deleted successfully`, "success");
    }
  };

  const handleBulkRoleChange = async (newRole) => {
    if (selectedIds.length === 0) return;
    for (const userId of selectedIds) {
      try {
        const response = await post("/users/updateRole", { userId, newRole });
        if (response.success) {
          const updated = response.data;
          setUsers((prev) => prev.map((u) => (u._id === userId ? updated : u)));
        }
      } catch (err) {
        showToast("Error updating role: " + err.message, "error");
      }
    }
    setSelectedIds([]);
    showToast(`${selectedIds.length} user(s) updated to ${newRole}`, "success");
  };

  const handleBulkBlock = async (shouldBlock) => {
    if (!isAdmin || selectedIds.length === 0) return;
    try {
      for (const userId of selectedIds) {
        const u = users.find((x) => x._id === userId);
        const isCurrentlyBlocked = isUserBlocked(u);
        if (u && isCurrentlyBlocked !== shouldBlock) {
          const response = await post("/users/toggleBlockUser", {
            userId,
            status: shouldBlock ? "blocked" : "unblock",
          });
          if (response.success) {
            const updated = response.data;
            setUsers((prev) => prev.map((item) => (item._id === userId ? updated : item)));
          }
        }
      }
      showToast(
        `${selectedIds.length} user(s) marked as ${shouldBlock ? "Blocked" : "Unblock"}`,
        "success"
      );
      setSelectedIds([]);
    } catch (err) {
      showToast("Error updating user status: " + err.message, "error");
    }
  };

  // Helper to render User Role Badge (matching Orders.jsx 104px badge style)
  const renderRoleBadge = (role) => {
    const r = String(role || "student").toLowerCase();
    let bg = "#fef3c7";
    let color = "#b45309";
    let border = "#fde68a";
    let label = "Student";

    if (r === "staff") {
      label = "Staff";
      bg = "#e0f2fe";
      color = "#0369a1";
      border = "#bae6fd";
    } else if (r === "admin") {
      label = "Admin";
      bg = "#f1f5f9";
      color = "#0f172a";
      border = "#cbd5e1";
    }

    return (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`,
          width: 104,
          minWidth: 104,
          maxWidth: 104,
          height: 26,
          borderRadius: "6px",
          fontWeight: 700,
          fontSize: "0.78rem",
          letterSpacing: 0.2,
          userSelect: "none",
          whiteSpace: "nowrap",
          boxSizing: "border-box",
          textAlign: "center",
        }}
      >
        {label}
      </Box>
    );
  };

  // Helper to render Status / Block Badge (matching Orders.jsx 104px badge style with interactive toggle)
  const renderStatusBadge = (user) => {
    const isBlocked = isUserBlocked(user);
    const label = isBlocked ? "Blocked" : "Unblock";
    const bg = isBlocked ? "#fee2e2" : "#dcfce7";
    const color = isBlocked ? "#b91c1c" : "#15803d";
    const border = isBlocked ? "#fecaca" : "#bbf7d0";

    const badge = (
      <Box
        onClick={isAdmin ? () => handleToggleBlock(user._id) : undefined}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          color: color,
          border: `1px solid ${border}`,
          width: 104,
          minWidth: 104,
          maxWidth: 104,
          height: 26,
          borderRadius: "6px",
          fontWeight: 700,
          fontSize: "0.78rem",
          letterSpacing: 0.2,
          userSelect: "none",
          whiteSpace: "nowrap",
          boxSizing: "border-box",
          textAlign: "center",
          cursor: isAdmin ? "pointer" : "default",
          transition: "all 0.15s ease",
          "&:hover": isAdmin
            ? {
                boxShadow: isBlocked
                  ? "0 2px 6px rgba(185, 28, 28, 0.25)"
                  : "0 2px 6px rgba(21, 128, 61, 0.25)",
                transform: "translateY(-0.5px)",
              }
            : {},
        }}
      >
        {label}
      </Box>
    );

    if (!isAdmin) return badge;

    return (
      <Tooltip title={isBlocked ? "Click to Unblock user" : "Click to Block user"} arrow>
        {badge}
      </Tooltip>
    );
  };

  // Grid columns definition matching Orders.jsx styling
  const tableGridCols = "48px minmax(180px, 1.2fr) 130px 110px 110px 120px 200px";

  return (
    <Box
      sx={{
        backgroundColor: "#f8fafc",
        height: "100vh",
        p: { xs: 2, sm: 2.5, md: 3 },
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <Box
        sx={{
          maxWidth: 1600,
          width: "100%",
          mx: "auto",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: { xs: 1.5, sm: 2 },
          minHeight: 0,
        }}
      >
        {/* 1. TOP 4 SPARKLINE SUMMARY CARDS (matching Orders.jsx) */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(1, 1fr)",
              sm: "repeat(2, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 2,
            flexShrink: 0,
          }}
        >
          <SparklineCard
            title="Total Users"
            value={Number(stats.total).toLocaleString("en-US")}
            strokeColor="#3b82f6"
            fillColor="#3b82f6"
            gradientId="gradUsersBlue"
            pathData={stats.totalSvg.pathData}
            areaData={stats.totalSvg.areaData}
            loading={loading}
          />
          <SparklineCard
            title="Students"
            value={Number(stats.students).toLocaleString("en-US")}
            strokeColor="#f59e0b"
            fillColor="#f59e0b"
            gradientId="gradUsersAmber"
            pathData={stats.studentsSvg.pathData}
            areaData={stats.studentsSvg.areaData}
            loading={loading}
          />
          <SparklineCard
            title="Staff"
            value={Number(stats.staff).toLocaleString("en-US")}
            strokeColor="#10b981"
            fillColor="#10b981"
            gradientId="gradUsersGreen"
            pathData={stats.staffSvg.pathData}
            areaData={stats.staffSvg.areaData}
            loading={loading}
          />
          <SparklineCard
            title="Blocked"
            value={Number(stats.blocked).toLocaleString("en-US")}
            strokeColor="#ef4444"
            fillColor="#ef4444"
            gradientId="gradUsersRed"
            pathData={stats.blockedSvg.pathData}
            areaData={stats.blockedSvg.areaData}
            loading={loading}
          />
        </Box>

        {/* 2. HORIZONTAL TAB NAVIGATION & SEARCH (matching Orders.jsx) */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #e2e8f0",
            pb: 0.2,
            flexWrap: "wrap",
            gap: 2,
            flexShrink: 0,
          }}
        >
          {/* Tabs - All users, Students, Staff, Blocked (No Admin tab) */}
          <Stack
            direction="row"
            spacing={{ xs: 2.5, sm: 4 }}
            alignItems="center"
            sx={{ overflowX: "auto" }}
          >
            {[
              { id: "all", label: "All users" },
              { id: "student", label: "Students" },
              { id: "staff", label: "Staff" },
              { id: "blocked", label: "Blocked" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <Typography
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(0);
                  }}
                  sx={{
                    fontSize: "0.95rem",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "#2563eb" : "#64748b",
                    cursor: "pointer",
                    py: 1.2,
                    position: "relative",
                    whiteSpace: "nowrap",
                    transition: "color 0.15s ease",
                    "&:hover": {
                      color: "#1d4ed8",
                    },
                    "&::after": isActive
                      ? {
                          content: '""',
                          position: "absolute",
                          bottom: -1,
                          left: 0,
                          right: 0,
                          height: "2.5px",
                          backgroundColor: "#2563eb",
                          borderRadius: "2px 2px 0 0",
                        }
                      : {},
                  }}
                >
                  {tab.label}
                </Typography>
              );
            })}
          </Stack>

          {/* Search bar & Refresh Button on the right */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField
              size="small"
              placeholder="Search users, roll no..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: { xs: "100%", sm: 260 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                  fontSize: "0.88rem",
                  border: "1px solid #e2e8f0",
                  "&:hover": { borderColor: "#cbd5e1" },
                  "&.Mui-focused": {
                    borderColor: "#3b82f6",
                    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                  },
                  "& fieldset": { border: "none" },
                },
              }}
            />
            <Tooltip title="Refresh users">
              <IconButton
                onClick={fetchStudents}
                disabled={loading}
                sx={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  p: 1,
                  color: "#64748b",
                  "&:hover": { backgroundColor: "#f1f5f9" },
                }}
              >
                <RefreshRoundedIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* 3. BULK ACTIONS BAR (When Checkbox Items Selected) */}
        {selectedIds.length > 0 && (
          <Box
            sx={{
              p: 1.5,
              px: 2.5,
              bgcolor: "#1e293b",
              color: "#fff",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1.5,
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
              {selectedIds.length} user{selectedIds.length > 1 ? "s" : ""} selected
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              {/* Role Field Tab */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  bgcolor: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  borderRadius: "10px",
                  px: 1.5,
                  py: 0.5,
                }}
              >
                <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#cbd5e1" }}>
                  Role:
                </Typography>
                <Button
                  size="small"
                  onClick={() => handleBulkRoleChange("student")}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    borderRadius: "6px",
                    px: 1.5,
                    py: 0.4,
                    bgcolor: "#f59e0b",
                    color: "#fff",
                    "&:hover": { bgcolor: "#d97706" },
                  }}
                >
                  Set Student
                </Button>
                <Button
                  size="small"
                  onClick={() => handleBulkRoleChange("staff")}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    borderRadius: "6px",
                    px: 1.5,
                    py: 0.4,
                    bgcolor: "#16a34a",
                    color: "#fff",
                    "&:hover": { bgcolor: "#15803d" },
                  }}
                >
                  Set Staff
                </Button>
              </Box>

              {/* Status / Block Option (Admin only) */}
              {isAdmin && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    bgcolor: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    borderRadius: "10px",
                    px: 1.5,
                    py: 0.5,
                  }}
                >
                  <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#cbd5e1" }}>
                    Status:
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => handleBulkBlock(false)}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      borderRadius: "6px",
                      px: 1.8,
                      py: 0.4,
                      bgcolor: "#059669",
                      color: "#fff",
                      "&:hover": { bgcolor: "#047857" },
                    }}
                  >
                    Set Unblock
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleBulkBlock(true)}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      borderRadius: "6px",
                      px: 1.8,
                      py: 0.4,
                      bgcolor: "#ea580c",
                      color: "#fff",
                      "&:hover": { bgcolor: "#c2410c" },
                    }}
                  >
                    Set Blocked
                  </Button>
                </Box>
              )}

              {/* Delete Button */}
              <Button
                size="small"
                onClick={() => setBulkDeleteDialog(true)}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  borderRadius: "8px",
                  px: 2,
                  py: 0.6,
                  bgcolor: "#ef4444",
                  color: "#fff",
                  "&:hover": { bgcolor: "#dc2626" },
                }}
              >
                Delete Selected
              </Button>
              <Button
                size="small"
                onClick={() => setSelectedIds([])}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  borderRadius: "8px",
                  px: 2,
                  py: 0.6,
                  color: "#e2e8f0",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" },
                }}
              >
                Clear
              </Button>
            </Stack>
          </Box>
        )}

        {/* 4. FULL SCREEN TABLE CARD */}
        <Box
          sx={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {/* ── MOBILE / TABLET: Card Grid (hidden on md+) ── */}
          <Box
            sx={{
              display: { xs: "block", md: "none" },
              flex: 1,
              overflowY: "auto",
              p: 1.5,
            }}
          >
            {loading ? (
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 1.5 }}>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <Box key={idx} sx={{ backgroundColor: "#f8fafc", borderRadius: "12px", p: 1.8 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={1.2}>
                      <Skeleton variant="circular" width={40} height={40} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton variant="text" width="60%" height={18} />
                        <Skeleton variant="text" width="40%" height={14} />
                      </Box>
                    </Stack>
                    <Skeleton variant="rounded" width="100%" height={28} sx={{ borderRadius: "8px" }} />
                  </Box>
                ))}
              </Box>
            ) : paginatedUsers.length === 0 ? (
              <Box sx={{ p: 6, textAlign: "center" }}>
                <Typography sx={{ color: "#0f172a", fontSize: "1.1rem", fontWeight: 700, mb: 0.5 }}>No users found</Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>
                  {searchQuery ? "No users match your search." : "No users in this view."}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 1.5 }}>
                {paginatedUsers.map((user) => {
                  const isSelected = selectedIds.includes(user._id);
                  const userAvatar = user.avatar || "";
                  const userName = user.username || "User";
                  const isBlocked = isUserBlocked(user);
                  return (
                    <Box
                      key={user._id}
                      onClick={() => handleSelectOne(user._id)}
                      sx={{
                        backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                        border: isSelected ? "1.5px solid #93c5fd" : "1px solid #e2e8f0",
                        borderRadius: "14px",
                        p: 1.6,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.06)", transform: "translateY(-1px)" },
                      }}
                    >
                      {/* Top row: Avatar + Name + Badges */}
                      <Stack direction="row" alignItems="center" spacing={1.2} mb={1.2}>
                        <Avatar
                          src={userAvatar}
                          alt={userName}
                          sx={{
                            width: 40, height: 40, fontSize: "0.9rem", fontWeight: 700, flexShrink: 0,
                            backgroundColor: userAvatar ? "transparent" : user.role === "admin" ? "#0f172a" : user.role === "staff" ? "#059669" : "#2563eb",
                            color: "#ffffff", border: "1px solid #e2e8f0",
                          }}
                        >
                          {!userAvatar && userName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography noWrap sx={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a", textTransform: "capitalize" }}>
                            {userName}
                          </Typography>
                          <Typography noWrap sx={{ color: "#94a3b8", fontSize: "0.74rem", fontWeight: 500 }}>
                            {user.rollNo || user.email || user.phoneNo || "—"}
                          </Typography>
                        </Box>
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => handleSelectOne(user._id)}
                          sx={{ p: 0, color: "#d1d5db", "&.Mui-checked": { color: "#2563eb" } }}
                        />
                      </Stack>

                      {/* Middle row: Role + Status badges */}
                      <Stack direction="row" spacing={1} mb={1.2}>
                        {renderRoleBadge(user.role)}
                        {renderStatusBadge(user)}
                        <Typography sx={{ color: "#94a3b8", fontSize: "0.74rem", fontWeight: 500, alignSelf: "center", ml: "auto !important" }}>
                          {formatCreatedDate(user.createdAt)}
                        </Typography>
                      </Stack>

                      {/* Bottom row: Actions */}
                      <Stack direction="row" spacing={0.8} onClick={(e) => e.stopPropagation()}>
                        {isAdmin && (
                          <Tooltip title={isBlocked ? "Unblock user" : "Block user"} arrow>
                            <Button
                              size="small"
                              onClick={() => handleToggleBlock(user._id)}
                              disabled={updatingId === user._id}
                              startIcon={isBlocked ? <CheckCircleRoundedIcon sx={{ fontSize: 14 }} /> : <BlockRoundedIcon sx={{ fontSize: 14 }} />}
                              sx={{
                                backgroundColor: isBlocked ? "#dcfce7" : "#fee2e2",
                                border: "1px solid", borderColor: isBlocked ? "#86efac" : "#fca5a5",
                                color: isBlocked ? "#15803d" : "#b91c1c",
                                borderRadius: "8px", textTransform: "none", fontWeight: 700, fontSize: "0.76rem",
                                px: 1.1, py: 0.35, minWidth: 76,
                                "&:hover": { backgroundColor: isBlocked ? "#bbf7d0" : "#fecaca" },
                              }}
                            >
                              {isBlocked ? "Unblock" : "Block"}
                            </Button>
                          </Tooltip>
                        )}
                        <Button
                          size="small"
                          onClick={(e) => { setRoleMenuAnchor(e.currentTarget); setSelectedUserForRole(user); }}
                          disabled={updatingId === user._id}
                          startIcon={<SettingsOutlinedIcon sx={{ fontSize: 15 }} />}
                          sx={{
                            backgroundColor: "#ffffff", border: "1px solid #e2e8f0", color: "#334155",
                            borderRadius: "8px", textTransform: "none", fontWeight: 600, fontSize: "0.76rem",
                            px: 1.1, py: 0.35,
                            "&:hover": { backgroundColor: "#f8fafc", borderColor: "#cbd5e1" },
                          }}
                        >
                          Role
                        </Button>
                        {isAdmin && (
                          <Tooltip title="Delete user" arrow>
                            <IconButton
                              size="small"
                              onClick={() => setDeleteDialog({ open: true, userId: user._id, username: user.username })}
                              disabled={updatingId === user._id}
                              sx={{ color: "#94a3b8", p: 0.6, borderRadius: "8px", "&:hover": { color: "#ef4444", backgroundColor: "#fee2e2" } }}
                            >
                              <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>

          {/* ── DESKTOP: Full Table (hidden below md) ── */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              flex: 1,
              minHeight: 0,
              flexDirection: "column",
              overflowX: "auto",
            }}
          >
            <Box
              sx={{
                minWidth: 860,
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Fixed Table Header */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: tableGridCols,
                  columnGap: 2,
                  alignItems: "center",
                  px: 2.5,
                  py: 2,
                  bgcolor: "#ffffff",
                  borderBottom: "2px solid #e2e8f0",
                  flexShrink: 0,
                  userSelect: "none",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Checkbox
                    size="small"
                    checked={selectedIds.length === paginatedUsers.length && paginatedUsers.length > 0}
                    indeterminate={selectedIds.length > 0 && selectedIds.length < paginatedUsers.length}
                    onChange={handleSelectAll}
                    sx={{ p: 0, color: "#d1d5db", "&.Mui-checked": { color: "#2563eb" }, "&.MuiCheckbox-indeterminate": { color: "#2563eb" } }}
                  />
                </Box>
                <Box>
                  <TableSortLabel active={orderBy === "username"} direction={orderBy === "username" ? order : "asc"} onClick={() => handleRequestSort("username")}
                    sx={{ fontWeight: 700, fontSize: "0.84rem", color: "#64748b", "&.Mui-active": { color: "#0f172a" }, "& .MuiTableSortLabel-icon": { color: "#2563eb !important" } }}>
                    User
                  </TableSortLabel>
                </Box>
                <Box>
                  <TableSortLabel active={orderBy === "rollNo"} direction={orderBy === "rollNo" ? order : "asc"} onClick={() => handleRequestSort("rollNo")}
                    sx={{ fontWeight: 700, fontSize: "0.84rem", color: "#64748b", "&.Mui-active": { color: "#0f172a" }, "& .MuiTableSortLabel-icon": { color: "#2563eb !important" } }}>
                    Roll No
                  </TableSortLabel>
                </Box>
                <Box>
                  <TableSortLabel active={orderBy === "role"} direction={orderBy === "role" ? order : "asc"} onClick={() => handleRequestSort("role")}
                    sx={{ fontWeight: 700, fontSize: "0.84rem", color: "#64748b", "&.Mui-active": { color: "#0f172a" }, "& .MuiTableSortLabel-icon": { color: "#2563eb !important" } }}>
                    Role
                  </TableSortLabel>
                </Box>
                <Box>
                  <TableSortLabel active={orderBy === "blocked"} direction={orderBy === "blocked" ? order : "asc"} onClick={() => handleRequestSort("blocked")}
                    sx={{ fontWeight: 700, fontSize: "0.84rem", color: "#64748b", "&.Mui-active": { color: "#0f172a" }, "& .MuiTableSortLabel-icon": { color: "#2563eb !important" } }}>
                    Status
                  </TableSortLabel>
                </Box>
                <Box>
                  <TableSortLabel active={orderBy === "createdAt"} direction={orderBy === "createdAt" ? order : "asc"} onClick={() => handleRequestSort("createdAt")}
                    sx={{ fontWeight: 700, fontSize: "0.84rem", color: "#64748b", "&.Mui-active": { color: "#0f172a" }, "& .MuiTableSortLabel-icon": { color: "#2563eb !important" } }}>
                    Joined
                  </TableSortLabel>
                </Box>
                <Box sx={{ textAlign: "right", color: "#64748b", fontSize: "0.84rem", fontWeight: 700, pr: 1 }}>Actions</Box>
              </Box>

              {/* Scrollable Table Rows */}
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  overflowX: "hidden",
                  "&::-webkit-scrollbar": { width: "6px", height: "6px" },
                  "&::-webkit-scrollbar-track": { background: "transparent" },
                  "&::-webkit-scrollbar-thumb": { backgroundColor: "#cbd5e1", borderRadius: "4px" },
                  "&::-webkit-scrollbar-thumb:hover": { backgroundColor: "#94a3b8" },
                }}
              >
                {loading ? (
                  <Box sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <Stack key={idx} direction="row" spacing={2} alignItems="center" sx={{ py: 0.5 }}>
                          <Skeleton variant="rounded" width={18} height={18} sx={{ borderRadius: "4px" }} />
                          <Skeleton variant="circular" width={34} height={34} />
                          <Box sx={{ flex: 1 }}>
                            <Skeleton variant="text" width="30%" height={18} />
                            <Skeleton variant="text" width="20%" height={14} />
                          </Box>
                          <Skeleton variant="text" width={100} height={22} />
                          <Skeleton variant="rounded" width={104} height={26} />
                          <Skeleton variant="rounded" width={104} height={26} />
                          <Skeleton variant="text" width={90} height={22} />
                          <Skeleton variant="rounded" width={120} height={28} />
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                ) : paginatedUsers.length === 0 ? (
                  <Box sx={{ p: 8, textAlign: "center" }}>
                    <Typography sx={{ color: "#0f172a", fontSize: "1.15rem", fontWeight: 700, mb: 1 }}>No users found</Typography>
                    <Typography sx={{ color: "#64748b", fontSize: "0.88rem" }}>
                      {searchQuery ? "No users match your search criteria." : "There are currently no users in this view."}
                    </Typography>
                  </Box>
                ) : (
                  paginatedUsers.map((user) => {
                    const isSelected = selectedIds.includes(user._id);
                    const userAvatar = user.avatar || "";
                    const userName = user.username || "User";
                    const isBlocked = isUserBlocked(user);

                    return (
                      <Box
                        key={user._id}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: tableGridCols,
                          columnGap: 2,
                          alignItems: "center",
                          px: 2.5,
                          py: 1.4,
                          borderBottom: "1px solid #f1f5f9",
                          bgcolor: isSelected ? "#eff6ff" : "transparent",
                          transition: "background-color 0.15s ease",
                          "&:hover": { backgroundColor: "#f8fafc" },
                        }}
                      >
                        {/* 1. Checkbox */}
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Checkbox size="small" checked={isSelected} onChange={() => handleSelectOne(user._id)}
                            sx={{ p: 0, color: "#d1d5db", "&.Mui-checked": { color: "#2563eb" } }} />
                        </Box>

                        {/* 2. User Avatar & Username & Email */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                          <Avatar src={userAvatar} alt={userName}
                            sx={{
                              width: 34, height: 34, fontSize: "0.85rem", fontWeight: 700, flexShrink: 0,
                              backgroundColor: userAvatar ? "transparent" : user.role === "admin" ? "#0f172a" : user.role === "staff" ? "#059669" : "#2563eb",
                              color: "#ffffff", p: userAvatar ? 0.5 : 0, border: "1px solid #e2e8f0",
                            }}
                          >
                            {!userAvatar && userName.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box sx={{ minWidth: 0, overflow: "hidden" }}>
                            <Typography noWrap sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", textTransform: "capitalize" }}>
                              {userName}
                            </Typography>
                            <Typography noWrap sx={{ color: "#94a3b8", fontSize: "0.75rem", fontWeight: 500 }}>
                              {user.email || user.phoneNo || "—"}
                            </Typography>
                          </Box>
                        </Box>

                        {/* 3. Roll No */}
                        <Box>
                          <Typography sx={{ color: "#0f172a", fontSize: "0.88rem", fontWeight: 600 }}>
                            {user.rollNo || "—"}
                          </Typography>
                        </Box>

                        {/* 4. Role Badge */}
                        <Box>{renderRoleBadge(user.role)}</Box>

                        {/* 5. Status Badge */}
                        <Box>{renderStatusBadge(user)}</Box>

                        {/* 6. Joined */}
                        <Box>
                          <Typography sx={{ color: "#64748b", fontSize: "0.84rem", fontWeight: 500 }}>
                            {formatCreatedDate(user.createdAt)}
                          </Typography>
                        </Box>

                        {/* 7. Actions */}
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.8 }}>
                          {isAdmin && (
                            <Tooltip title={isBlocked ? "Unblock user" : "Block user"} arrow>
                              <Button size="small" onClick={() => handleToggleBlock(user._id)} disabled={updatingId === user._id}
                                startIcon={isBlocked ? <CheckCircleRoundedIcon sx={{ fontSize: 14 }} /> : <BlockRoundedIcon sx={{ fontSize: 14 }} />}
                                sx={{
                                  backgroundColor: isBlocked ? "#dcfce7" : "#fee2e2",
                                  border: "1px solid", borderColor: isBlocked ? "#86efac" : "#fca5a5",
                                  color: isBlocked ? "#15803d" : "#b91c1c",
                                  borderRadius: "8px", textTransform: "none", fontWeight: 700, fontSize: "0.76rem",
                                  px: 1.1, py: 0.35, minWidth: 80,
                                  "&:hover": { backgroundColor: isBlocked ? "#bbf7d0" : "#fecaca" },
                                }}
                              >
                                {isBlocked ? "Unblock" : "Block"}
                              </Button>
                            </Tooltip>
                          )}
                          <Button size="small"
                            onClick={(e) => { setRoleMenuAnchor(e.currentTarget); setSelectedUserForRole(user); }}
                            disabled={updatingId === user._id}
                            startIcon={<SettingsOutlinedIcon sx={{ fontSize: 15 }} />}
                            sx={{
                              backgroundColor: "#ffffff", border: "1px solid #e2e8f0", color: "#334155",
                              borderRadius: "8px", textTransform: "none", fontWeight: 600, fontSize: "0.76rem",
                              px: 1.1, py: 0.35,
                              "&:hover": { backgroundColor: "#f8fafc", borderColor: "#cbd5e1", color: "#0f172a" },
                            }}
                          >
                            Role
                          </Button>
                          {isAdmin && (
                            <Tooltip title="Delete user" arrow>
                              <IconButton size="small"
                                onClick={() => setDeleteDialog({ open: true, userId: user._id, username: user.username })}
                                disabled={updatingId === user._id}
                                sx={{ color: "#94a3b8", p: 0.6, borderRadius: "8px", "&:hover": { color: "#ef4444", backgroundColor: "#fee2e2" } }}
                              >
                                <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            </Box>
          </Box>

          {/* Fixed Pagination Bar docked at the bottom of the card (matching Orders.jsx) */}
          <Box
            sx={{
              px: 2,
              py: 0.5,
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              bgcolor: "#ffffff",
              flexShrink: 0,
            }}
          >
            <TablePagination
              component="div"
              count={filteredUsers.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
              sx={{
                color: "#64748b",
                "& .MuiTablePagination-select": { fontWeight: 600 },
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Role Change Menu - High contrast & crystal clear */}
      <Menu
        anchorEl={roleMenuAnchor}
        open={Boolean(roleMenuAnchor)}
        onClose={() => {
          setRoleMenuAnchor(null);
          setSelectedUserForRole(null);
        }}
        PaperProps={{
          elevation: 0,
          sx: {
            borderRadius: "14px",
            boxShadow: "0 10px 30px -5px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
            minWidth: 200,
            p: 0.8,
            border: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <Box sx={{ px: 1.5, py: 1, borderBottom: "1px solid #f1f5f9", mb: 0.6 }}>
          <Typography
            sx={{
              fontSize: "0.68rem",
              fontWeight: 800,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            Change User Role
          </Typography>
       
        </Box>

        {["student", "staff"].map((roleOption) => {
          const isCurrent =
            String(selectedUserForRole?.role || "").toLowerCase() === roleOption;

          return (
            <MenuItem
              key={roleOption}
              onClick={() => {
                if (!isCurrent) {
                  handleUpdateRole(
                    selectedUserForRole._id,
                    selectedUserForRole.username,
                    roleOption
                  );
                } else {
                  setRoleMenuAnchor(null);
                  setSelectedUserForRole(null);
                }
              }}
              sx={{
                borderRadius: "10px",
                py: 1,
                px: 1.4,
                my: 0.3,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: isCurrent ? "#f8fafc" : "transparent",
                border: isCurrent ? "1px solid #e2e8f0" : "1px solid transparent",
                transition: "all 0.15s ease",
                "&:hover": {
                  bgcolor: isCurrent ? "#f1f5f9" : "#eff6ff",
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                <Box
                  sx={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    bgcolor: roleOption === "student" ? "#f59e0b" : "#0284c7",
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    color: isCurrent ? "#0f172a" : "#334155",
                  }}
                >
                  {roleOption === "student" ? "Student" : "Staff"}
                </Typography>
              </Box>

              {isCurrent ? (
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.4,
                    bgcolor: "#dcfce7",
                    color: "#15803d",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    px: 1,
                    py: 0.25,
                    borderRadius: "6px",
                  }}
                >
                  <CheckRoundedIcon sx={{ fontSize: 13, strokeWidth: 1 }} />
                  Current
                </Box>
              ) : (
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    color: "#3b82f6",
                    fontWeight: 600,
                  }}
                >
                  Assign
                </Typography>
              )}
            </MenuItem>
          );
        })}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() =>
          setDeleteDialog({ open: false, userId: null, username: "" })
        }
        PaperProps={{ sx: { borderRadius: "16px", p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.1rem" }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#64748b", fontSize: "0.92rem" }}>
            Are you sure you want to delete user{" "}
            <strong>"{deleteDialog.username}"</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() =>
              setDeleteDialog({ open: false, userId: null, username: "" })
            }
            sx={{ textTransform: "none", fontWeight: 600, color: "#64748b" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={performDelete}
            disabled={updatingId === deleteDialog.userId}
            sx={{
              bgcolor: "#ef4444",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "10px",
              px: 3,
              "&:hover": { bgcolor: "#dc2626" },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={bulkDeleteDialog}
        onClose={() => setBulkDeleteDialog(false)}
        PaperProps={{ sx: { borderRadius: "16px", p: 1, maxWidth: 420, width: "100%" } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.1rem" }}>
          Delete Selected Users
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#64748b", fontSize: "0.92rem" }}>
            Are you sure you want to delete{" "}
            <strong>{selectedIds.length}</strong> selected user
            {selectedIds.length > 1 ? "s" : ""}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setBulkDeleteDialog(false)}
            sx={{ textTransform: "none", fontWeight: 600, color: "#64748b" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={performBulkDelete}
            disabled={Boolean(updatingId)}
            sx={{
              bgcolor: "#ef4444",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "10px",
              px: 3,
              "&:hover": { bgcolor: "#dc2626" },
            }}
          >
            Delete All Selected
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
