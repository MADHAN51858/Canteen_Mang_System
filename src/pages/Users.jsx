import { useState, useEffect, useMemo, useContext } from "react";
import { post } from "../utils/api";
import { useToast } from "../hooks/useToast";
import { CartContext } from "../context/CartContext";
import {
  Box,
  Stack,
  Typography,
  Button,
  Chip,
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
  FormControl,
  Select,
  MenuItem,
  Menu,
  Badge,
  TablePagination,
} from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import DeleteIcon from "@mui/icons-material/Delete";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

// proicons:filter from Iconify (https://api.iconify.design/proicons:filter.svg)
function ProFilterIcon(props) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
      {...props}
    >
      <path
        d="M4.5 7.25h15M7.385 12h9.23m-6.345 4.75h3.46"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIconOutlined(props) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="11" cy="11" r="7.5" stroke="#94a3b8" strokeWidth="2" />
      <path d="m21 21-4.35-4.35" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Users() {
  const { user: currentUser } = useContext(CartContext);
  const isAdmin = String(currentUser?.role || "").toLowerCase() === "admin";
  const isUserBlocked = (u) => u?.status === "blocked" || u?.status === "block" || Boolean(u?.blocked);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    userId: null,
    username: "",
  });
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const filterOpen = Boolean(filterAnchorEl);

  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };
  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };
  const handleSelectRole = (role) => {
    setRoleFilter(role);
    setPage(0);
    handleFilterClose();
  };
  const [orderBy, setOrderBy] = useState("username");
  const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedIds, setSelectedIds] = useState([]);
  const { showToast } = useToast();

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const filteredUsers = useMemo(() => {
    let result = users;
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const rollMatch = q.match(/^1db23cs(\d+)$/i);
      const paddedVariant = rollMatch ? `1db23cs${String(parseInt(rollMatch[1], 10)).padStart(3, "0")}` : null;
      const unpaddedVariant = rollMatch ? `1db23cs${parseInt(rollMatch[1], 10)}` : null;

      result = result.filter(
        (u) =>
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          String(u.phoneNo || "").toLowerCase().includes(q) ||
          String(u.rollNo || "").toLowerCase().includes(q) ||
          (paddedVariant && (u.rollNo?.toLowerCase() === paddedVariant || u.username?.toLowerCase() === paddedVariant)) ||
          (unpaddedVariant && (u.rollNo?.toLowerCase() === unpaddedVariant || u.username?.toLowerCase() === unpaddedVariant))
      );
    }
    return result;
  }, [users, roleFilter, searchQuery]);

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
        if (!isNaN(aNum) && !isNaN(bNum) && String(aNum) === String(a.rollNo).trim() && String(bNum) === String(b.rollNo).trim()) {
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
      }

      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, orderBy, order]);

  const paginatedUsers = useMemo(() => {
    return sortedUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedUsers, page, rowsPerPage]);

  const getRoleChipStyle = (role) => {
    switch (role) {
      case "admin":
        return { bgcolor: "#1f2937", color: "#ffffff" };
      case "staff":
        return { bgcolor: "#16a34a", color: "#ffffff" };
      case "student":
        return { bgcolor: "#f59e0b", color: "#ffffff" };
      default:
        return { bgcolor: "#94a3b8", color: "#ffffff" };
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await post("/users/getAllUsers", {});

      if (response.success) {
        const all = response.data || [];
        // Hide permanent admins (role admin with previousRole also admin)
        const visible = all.filter(
          (u) => !(u.role === "admin" && u.previousRole === "admin")
        );
        setUsers(visible);
      } else {
        const errorMsg = response.message || "Failed to fetch users";
        setError(errorMsg);
        showToast(errorMsg, "error");
      }
    } catch (err) {
      const errorMsg = "Error fetching users: " + err.message;
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId, username, newRole) => {
    try {
      setUpdatingId(userId);
      const response = await post("/users/updateRole", { userId, newRole });

      if (response.success) {
        const updated = response.data;
        setUsers((prev) => prev.map((u) => (u._id === userId ? updated : u)));
        showToast(`Role updated to ${newRole}`, "success");
      } else {
        const errorMsg = response.message || "Failed to update role";
        showToast(errorMsg, "error");
      }
    } catch (err) {
      const errorMsg = "Error updating role: " + err.message;
      showToast(errorMsg, "error");
    } finally {
      setUpdatingId(null);
    }
  };

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
        const errorMsg = response.message || "Failed to update status";
        showToast(errorMsg, "error");
      }
    } catch (err) {
      const errorMsg = "Error updating status: " + err.message;
      showToast(errorMsg, "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    setDeleteDialog({ open: true, userId, username });
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
        const errorMsg = response.message || "Failed to delete user";
        showToast(errorMsg, "error");
      }
    } catch (err) {
      const errorMsg = "Error deleting user: " + err.message;
      showToast(errorMsg, "error");
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

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setBulkDeleteDialog(true);
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
      showToast(`${selectedIds.length} user(s) marked as ${shouldBlock ? "Blocked" : "Unblock"}`, "success");
      setSelectedIds([]);
    } catch (err) {
      showToast("Error updating user status: " + err.message, "error");
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3, md: 3.5 },
        height: "100vh",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: "#f8fafc",
      }}
    >
      {/* Container */}
      <Box
        sx={{
          maxWidth: 1600,
          width: "100%",
          mx: "auto",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minHeight: 0,
        }}
      >
        {/* Bulk Actions Floating/Fixed Bar */}
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
              animation: "fadeIn 0.2s ease",
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

              {/* Status Field Tab (Admin only) */}
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

              {/* Action Buttons */}
              <Button
                size="small"
                onClick={handleBulkDelete}
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

        {/* Table Card */}
        <Box
          sx={{
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #f0f0f0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {/* Search and Role filter matching screenshot */}
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-start",
              bgcolor: "#ffffff",
              flexShrink: 0,
            }}
          >
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{ flex: 1, flexWrap: "wrap" }}
            >
              {/* Search Users Input */}
              <TextField
                placeholder="Search Users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ mr: 1, ml: 0.5 }}>
                      <SearchIconOutlined />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: { xs: "100%", sm: 300, md: 360 },
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    height: 42,
                    color: "#334155",
                    "& input::placeholder": {
                      color: "#94a3b8",
                      opacity: 1,
                    },
                    "&:hover": { borderColor: "#cbd5e1" },
                    "&.Mui-focused": {
                      borderColor: "#f59e0b",
                      boxShadow: "0 0 0 3px rgba(245, 158, 11, 0.1)",
                    },
                    "& fieldset": { border: "none" },
                  },
                }}
              />

              {/* Role Filter Button with proicons:filter */}
              <Tooltip title={roleFilter !== "all" ? `Filtered: ${roleFilter.toUpperCase()}` : "Filter by Role"} arrow>
                <IconButton
                  onClick={handleFilterClick}
                  sx={{
                    color: roleFilter !== "all" ? "#f59e0b" : "#64748b",
                    bgcolor: roleFilter !== "all" ? "rgba(245, 158, 11, 0.08)" : "transparent",
                    borderRadius: "10px",
                    p: 1.1,
                    transition: "all 0.15s ease",
                    "&:hover": {
                      bgcolor: roleFilter !== "all" ? "rgba(245, 158, 11, 0.16)" : "#f8fafc",
                      color: roleFilter !== "all" ? "#d97706" : "#334155",
                    },
                  }}
                >
                  <Badge
                    variant="dot"
                    invisible={roleFilter === "all"}
                    sx={{
                      "& .MuiBadge-badge": {
                        bgcolor: "#f59e0b",
                        top: 2,
                        right: 2,
                      },
                    }}
                  >
                    <ProFilterIcon />
                  </Badge>
                </IconButton>
              </Tooltip>

              {/* Active filter pill if not 'all' */}
              {roleFilter !== "all" && (
                <Chip
                  label={`Role: ${roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}`}
                  size="small"
                  onDelete={() => {
                    setRoleFilter("all");
                    setPage(0);
                  }}
                  sx={{
                    bgcolor: "rgba(245, 158, 11, 0.1)",
                    color: "#b45309",
                    fontWeight: 600,
                    fontSize: "0.78rem",
                    border: "1px solid rgba(245, 158, 11, 0.2)",
                    borderRadius: "8px",
                    "& .MuiChip-deleteIcon": {
                      color: "#b45309",
                      "&:hover": { color: "#92400e" },
                    },
                  }}
                />
              )}

              {/* Role Selection Menu */}
              <Menu
                anchorEl={filterAnchorEl}
                open={filterOpen}
                onClose={handleFilterClose}
                PaperProps={{
                  sx: {
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                    minWidth: 160,
                    p: 0.5,
                    mt: 1,
                    border: "1px solid #f1f5f9",
                  },
                }}
                transformOrigin={{ horizontal: "left", vertical: "top" }}
                anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
              >
                <Box sx={{ px: 1.5, py: 1, borderBottom: "1px solid #f1f5f9" }}>
                  <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Filter by Role
                  </Typography>
                </Box>
                {[
                  { label: "All Roles", value: "all" },
                  { label: "Student", value: "student" },
                  { label: "Staff", value: "staff" },
                  { label: "Admin", value: "admin" },
                ].map((option) => (
                  <MenuItem
                    key={option.value}
                    selected={roleFilter === option.value}
                    onClick={() => handleSelectRole(option.value)}
                    sx={{
                      borderRadius: "8px",
                      fontSize: "0.86rem",
                      fontWeight: roleFilter === option.value ? 700 : 500,
                      color: roleFilter === option.value ? "#f59e0b" : "#374151",
                      py: 1,
                      px: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      "&.Mui-selected": {
                        bgcolor: "rgba(245, 158, 11, 0.08)",
                        "&:hover": { bgcolor: "rgba(245, 158, 11, 0.12)" },
                      },
                    }}
                  >
                    {option.label}
                    {roleFilter === option.value && (
                      <CheckRoundedIcon sx={{ fontSize: 16, color: "#f59e0b" }} />
                    )}
                  </MenuItem>
                ))}
              </Menu>
            </Stack>
          </Box>

          {loading ? (
            /* Loading Skeleton */
            <Box sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                {Array.from({ length: 7 }).map((_, idx) => (
                  <Stack key={idx} direction="row" spacing={2} alignItems="center" sx={{ py: 0.5 }}>
                    <Skeleton variant="rounded" width={18} height={18} sx={{ borderRadius: "4px" }} />
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="25%" height={18} />
                      <Skeleton variant="text" width="18%" height={14} />
                    </Box>
                    <Skeleton variant="rounded" width={70} height={26} sx={{ borderRadius: "6px" }} />
                    <Skeleton variant="text" width="12%" height={16} />
                    <Skeleton variant="text" width="12%" height={16} />
                  </Stack>
                ))}
              </Stack>
            </Box>
          ) : sortedUsers.length === 0 ? (
            <Box sx={{ p: 8, textAlign: "center" }}>
              <PersonOutlineRoundedIcon sx={{ fontSize: 56, color: "#d1d5db", mb: 2 }} />
              <Typography sx={{ color: "#9ca3af", fontSize: "1.1rem", fontWeight: 600 }}>
                No users found
              </Typography>
              <Typography sx={{ color: "#d1d5db", fontSize: "0.86rem", mt: 0.5 }}>
                {searchQuery || roleFilter !== "all" ? "Try adjusting your search or role filter" : "No users in the system yet"}
              </Typography>
            </Box>
          ) : (
            <>
              {/* Table Container with Fixed Header and Scrollable Body */}
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  overflowX: "auto",
                }}
              >
                <Box
                  sx={{
                    minWidth: 1000,
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Fixed Table Header - stationary right below filter tabs */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "48px minmax(160px, 1fr) 110px 130px 110px 320px",
                      columnGap: 2.5,
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
                        sx={{
                          p: 0,
                          color: "#d1d5db",
                          "&.Mui-checked": { color: "#f59e0b" },
                          "&.MuiCheckbox-indeterminate": { color: "#f59e0b" },
                        }}
                      />
                    </Box>
                    <Box>
                      <TableSortLabel
                        active={orderBy === "username"}
                        direction={orderBy === "username" ? order : "asc"}
                        onClick={() => handleRequestSort("username")}
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.84rem",
                          color: "#374151",
                          "&.Mui-active": { color: "#0f172a" },
                          "& .MuiTableSortLabel-icon": { color: "#f59e0b !important" },
                        }}
                      >
                        Name
                      </TableSortLabel>
                    </Box>
                    <Box>
                      <TableSortLabel
                        active={orderBy === "role"}
                        direction={orderBy === "role" ? order : "asc"}
                        onClick={() => handleRequestSort("role")}
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.84rem",
                          color: "#374151",
                          "&.Mui-active": { color: "#0f172a" },
                          "& .MuiTableSortLabel-icon": { color: "#f59e0b !important" },
                        }}
                      >
                        User Role
                      </TableSortLabel>
                    </Box>
                    <Box>
                      <TableSortLabel
                        active={orderBy === "rollNo"}
                        direction={orderBy === "rollNo" ? order : "asc"}
                        onClick={() => handleRequestSort("rollNo")}
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.84rem",
                          color: "#374151",
                          "&.Mui-active": { color: "#0f172a" },
                          "& .MuiTableSortLabel-icon": { color: "#f59e0b !important" },
                        }}
                      >
                        Roll No
                      </TableSortLabel>
                    </Box>
                    <Box>
                      <TableSortLabel
                        active={orderBy === "blocked"}
                        direction={orderBy === "blocked" ? order : "asc"}
                        onClick={() => handleRequestSort("blocked")}
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.84rem",
                          color: "#374151",
                          "&.Mui-active": { color: "#0f172a" },
                          "& .MuiTableSortLabel-icon": { color: "#f59e0b !important" },
                        }}
                      >
                        Status
                      </TableSortLabel>
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.84rem", color: "#374151" }}>
                        Actions
                      </Typography>
                    </Box>
                  </Box>

                  {/* Scrollable Table Rows - Scrollbar strictly starts below header */}
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                      overflowX: "hidden",
                      "&::-webkit-scrollbar": {
                        width: "6px",
                        height: "6px",
                      },
                      "&::-webkit-scrollbar-track": {
                        background: "transparent",
                      },
                      "&::-webkit-scrollbar-thumb": {
                        backgroundColor: "#cbd5e1",
                        borderRadius: "4px",
                      },
                      "&::-webkit-scrollbar-thumb:hover": {
                        backgroundColor: "#94a3b8",
                      },
                    }}
                  >
                    {paginatedUsers.map((user) => {
                      const roleStyle = getRoleChipStyle(user.role);
                      const isSelected = selectedIds.includes(user._id);
                      return (
                        <Box
                          key={user._id}
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "48px minmax(150px, 1fr) 110px 130px 110px 320px",
                            columnGap: 2.5,
                            alignItems: "center",
                            px: 2.5,
                            py: 1.5,
                            borderBottom: "1px solid #f3f4f6",
                            bgcolor: isSelected ? "#fffbeb" : "transparent",
                            transition: "background-color 0.15s ease",
                            "&:hover": { backgroundColor: "#fefce8" },
                          }}
                        >
                          {/* Checkbox */}
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Checkbox
                              size="small"
                              checked={isSelected}
                              onChange={() => handleSelectOne(user._id)}
                              sx={{
                                p: 0,
                                color: "#d1d5db",
                                "&.Mui-checked": { color: "#f59e0b" },
                              }}
                            />
                          </Box>

                          {/* Name + Avatar + Email */}
                          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, pr: 1 }}>
                            <Avatar
                              src={user.avatar}
                              alt={user.username}
                              sx={{
                                width: 44,
                                height: 44,
                                flexShrink: 0,
                                fontWeight: 700,
                                fontSize: "1rem",
                                bgcolor: user.avatar ? "transparent" : (user.role === "admin" ? "#374151" : user.role === "staff" ? "#16a34a" : "#f59e0b"),
                                border: "2px solid #cacacaff",
                              }}
                            >
                              {!user.avatar && (user.username ? user.username[0].toUpperCase() : "U")}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 700, color: "#111827", fontSize: "0.9rem", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {user.username}
                              </Typography>
                              <Typography sx={{ color: "#9ca3af", fontSize: "0.78rem", fontWeight: 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {user.email || "—"}
                              </Typography>
                            </Box>
                          </Stack>

                          {/* User Role Chip */}
                          <Box>
                            <Chip
                              label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              size="small"
                              sx={{
                                ...roleStyle,
                                fontWeight: 700,
                                fontSize: "0.75rem",
                                height: 26,
                                width: 82,
                                minWidth: 82,
                                justifyContent: "center",
                                borderRadius: "6px",
                                letterSpacing: "0.2px",
                              }}
                            />
                          </Box>

                          {/* Roll No */}
                          <Box>
                            <Typography sx={{ color: "#374151", fontSize: "0.86rem", fontWeight: 600 }}>
                              {user.rollNo || "—"}
                            </Typography>
                          </Box>

                          {/* Status - Blocked / Unblock */}
                          <Box>
                            {(() => {
                              const isBlocked = isUserBlocked(user);
                              return isAdmin ? (
                                <Tooltip
                                  title={isBlocked ? "Click to Unblock" : "Click to Block"}
                                  arrow
                                >
                                  <Chip
                                    label={isBlocked ? "Blocked" : "Unblock"}
                                    size="small"
                                    disabled={updatingId === user._id}
                                    onClick={() => handleToggleBlock(user._id)}
                                    sx={{
                                      cursor: "pointer",
                                      fontWeight: 700,
                                      fontSize: "0.75rem",
                                      height: 26,
                                      width: 82,
                                      minWidth: 82,
                                      justifyContent: "center",
                                      borderRadius: "6px",
                                      bgcolor: isBlocked ? "#fee2e2" : "#dcfce7",
                                      color: isBlocked ? "#b91c1c" : "#15803d",
                                      border: "1px solid",
                                      borderColor: isBlocked ? "#fca5a5" : "#86efac",
                                      transition: "all 0.15s ease",
                                      "&:hover": {
                                        bgcolor: isBlocked ? "#fecaca" : "#bbf7d0",
                                        boxShadow: isBlocked
                                          ? "0 1px 4px rgba(220, 38, 38, 0.25)"
                                          : "0 1px 4px rgba(22, 163, 74, 0.25)",
                                      },
                                    }}
                                  />
                                </Tooltip>
                              ) : (
                                <Chip
                                  label={isBlocked ? "Blocked" : "Unblock"}
                                  size="small"
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: "0.75rem",
                                    height: 26,
                                    width: 82,
                                    minWidth: 82,
                                    justifyContent: "center",
                                    borderRadius: "6px",
                                    bgcolor: isBlocked ? "#fee2e2" : "#dcfce7",
                                    color: isBlocked ? "#b91c1c" : "#15803d",
                                    border: "1px solid",
                                    borderColor: isBlocked ? "#fca5a5" : "#86efac",
                                  }}
                                />
                              );
                            })()}
                          </Box>

                          {/* Actions */}
                          <Box>
                            <Stack direction="row" spacing={2.5} alignItems="center">
                              {/* Modify Roles */}
                              <Tooltip
                                title={
                                  <Stack spacing={0.5} sx={{ p: 0.5 }}>
                                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: "#9ca3af", mb: 0.5 }}>
                                      Change role to:
                                    </Typography>
                                    {["student", "staff"].map((r) => (
                                      <Button
                                        key={r}
                                        size="small"
                                        disabled={user.role === r || updatingId === user._id}
                                        onClick={() => handleUpdateRole(user._id, user.username, r)}
                                        sx={{
                                          textTransform: "none",
                                          fontWeight: 600,
                                          fontSize: "0.78rem",
                                          color: "#fff",
                                          justifyContent: "flex-start",
                                          px: 1.5,
                                          py: 0.3,
                                          borderRadius: "6px",
                                          bgcolor: user.role === r ? "#d1d5db" : getRoleChipStyle(r).bgcolor,
                                          "&:hover": { opacity: 0.85, bgcolor: getRoleChipStyle(r).bgcolor },
                                          "&.Mui-disabled": { bgcolor: "#e5e7eb", color: "#9ca3af" },
                                        }}
                                      >
                                        {r.charAt(0).toUpperCase() + r.slice(1)}
                                      </Button>
                                    ))}
                                  </Stack>
                                }
                                arrow
                                placement="bottom"
                                slotProps={{
                                  tooltip: {
                                    sx: {
                                      bgcolor: "#1f2937",
                                      borderRadius: "10px",
                                      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                                      p: 1,
                                    },
                                  },
                                  arrow: { sx: { color: "#1f2937" } },
                                }}
                              >
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  spacing={0.6}
                                  sx={{
                                    cursor: "pointer",
                                    color: "#6b7280",
                                    transition: "color 0.15s",
                                    "&:hover": { color: "#374151" },
                                  }}
                                >
                                  <SettingsOutlinedIcon sx={{ fontSize: 16 }} />
                                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>
                                    Modify Roles
                                  </Typography>
                                </Stack>
                              </Tooltip>

                                {/* Block / Unblock - Only visible to admin */}
                                {isAdmin && (() => {
                                  const isBlocked = isUserBlocked(user);
                                  return (
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      spacing={0.6}
                                      onClick={() => handleToggleBlock(user._id)}
                                      sx={{
                                        cursor: "pointer",
                                        color: isBlocked ? "#16a34a" : "#ea580c",
                                        transition: "opacity 0.15s",
                                        "&:hover": { opacity: 0.75 },
                                      }}
                                    >
                                      <BlockRoundedIcon sx={{ fontSize: 16 }} />
                                      <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>
                                        {isBlocked ? "Unblock" : "Block"}
                                      </Typography>
                                    </Stack>
                                  );
                                })()}

                                {/* Remove User */}
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={0.6}
                                onClick={() => handleDeleteUser(user._id, user.username)}
                                sx={{
                                  cursor: "pointer",
                                  color: "#ef4444",
                                  transition: "opacity 0.15s",
                                  "&:hover": { opacity: 0.7 },
                                }}
                              >
                                <CancelOutlinedIcon sx={{ fontSize: 16 }} />
                                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>
                                  Remove User
                                </Typography>
                              </Stack>
                            </Stack>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>

              {/* Table Pagination matching user image */}
              <TablePagination
                component="div"
                count={sortedUsers.length}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                sx={{
                  borderTop: "1px solid #f1f5f9",
                  bgcolor: "#ffffff",
                  flexShrink: 0,
                  "& .MuiTablePagination-toolbar": {
                    minHeight: 52,
                    px: { xs: 1.5, sm: 3 },
                    justifyContent: "flex-end",
                  },
                  "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    m: 0,
                  },
                  "& .MuiTablePagination-select": {
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    py: 0.5,
                  },
                  "& .MuiTablePagination-actions": {
                    ml: 2,
                  },
                  "& .MuiIconButton-root": {
                    p: 0.8,
                    "&.Mui-disabled": {
                      color: "#cbd5e1",
                    },
                  },
                }}
              />
            </>
          )}
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() =>
          setDeleteDialog({ open: false, userId: null, username: "" })
        }
        PaperProps={{ sx: { borderRadius: "16px", p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#111827", fontSize: "1.1rem" }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#6b7280", fontSize: "0.92rem" }}>
            Are you sure you want to delete user{" "}
            <strong>"{deleteDialog.username}"</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() =>
              setDeleteDialog({ open: false, userId: null, username: "" })
            }
            sx={{ textTransform: "none", fontWeight: 600, color: "#6b7280" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<DeleteIcon />}
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
        <DialogTitle sx={{ fontWeight: 800, color: "#111827", fontSize: "1.1rem" }}>
          Delete Selected Users
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#6b7280", fontSize: "0.92rem" }}>
            Are you sure you want to delete{" "}
            <strong>{selectedIds.length}</strong> selected user
            {selectedIds.length > 1 ? "s" : ""}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setBulkDeleteDialog(false)}
            sx={{ textTransform: "none", fontWeight: 600, color: "#6b7280" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<DeleteIcon />}
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
