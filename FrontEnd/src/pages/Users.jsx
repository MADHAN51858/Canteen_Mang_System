import { useState, useEffect } from "react";
import { post } from "../utils/api";
import { useToast } from "../hooks/useToast";
import {
  Container,
  Box,
  Stack,
  Typography,
  Card,
  Button,
  Chip,
  Grid,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeIcon from "@mui/icons-material/Badge";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    userId: null,
    username: "",
  });
  const [secretDialog, setSecretDialog] = useState(false);
  const [secretInput, setSecretInput] = useState("");
  const [secretAction, setSecretAction] = useState(null); // "delete" or "block"
  const [pendingUserId, setPendingUserId] = useState(null);
  const { showToast } = useToast();

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
    setSecretDialog(true);
    setSecretInput("");
    setSecretAction("block");
    setPendingUserId(userId);
  };

  const performBlock = async () => {
    try {
      setUpdatingId(pendingUserId);
      const response = await post("/users/toggleBlockUser", { userId: pendingUserId });

      if (response.success) {
        const updated = response.data;
        setUsers((prev) => prev.map((u) => (u._id === pendingUserId ? updated : u)));
        const status = updated.blocked ? "blocked" : "unblocked";
        showToast(`User ${status} successfully`, "success");
      } else {
        const errorMsg = response.message || "Failed to update block status";
        showToast(errorMsg, "error");
      }
    } catch (err) {
      const errorMsg = "Error updating block status: " + err.message;
      showToast(errorMsg, "error");
    } finally {
      setUpdatingId(null);
      setPendingUserId(null);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    setDeleteDialog({ open: true, userId, username });
  };

  const confirmSecretCode = () => {
    if (secretInput === "madhu") {
      setSecretDialog(false);
      setSecretInput("");
      
      if (secretAction === "delete") {
        performDelete();
      } else if (secretAction === "block") {
        performBlock();
      }
      setSecretAction(null);
    } else {
      setSecretInput("");
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

  const confirmDelete = async () => {
    setSecretDialog(true);
    setSecretInput("");
    setSecretAction("delete");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc" }}>
      {/* Hero Header */}
      <Container maxWidth="lg" sx={{ pt: 4, pb: 4 }}>
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
              <PersonIcon sx={{ fontSize: 36, color: "white" }} />
            </Box>
            <Box>
              <Typography variant="h3" fontWeight={900} sx={{ fontSize: { xs: "1.75rem", sm: "2.5rem" }, color: "white", lineHeight: 1 }}>
                Manage Users
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5 }}>
                Control roles, permissions & user access
              </Typography>
            </Box>
          </Stack>
        </Stack>

        {loading ? (
          <Grid container spacing={2.5}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <Grid item xs={12} sm={6} md={6} key={idx}>
                <Card
                  sx={{
                    borderRadius: 3,
                    p: 2.5,
                    background: "white",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                >
                  <Stack spacing={1.5}>
                    <Box>
                      <Skeleton variant="text" width="60%" height={28} sx={{ mb: 0.5 }} />
                      <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 999 }} />
                    </Box>

                    <Grid container spacing={1.25}>
                      <Grid item xs={12}>
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1.25,
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <Skeleton variant="circular" width={20} height={20} />
                          <Box sx={{ flex: 1 }}>
                            <Skeleton variant="text" width={60} height={14} sx={{ mb: 0.5 }} />
                            <Skeleton variant="text" width="85%" height={18} />
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>

                    <Grid container spacing={1.25}>
                      {Array.from({ length: 2 }).map((_, i) => (
                        <Grid item xs={12} sm={6} key={i}>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1.25,
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: "#f8fafc",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <Skeleton variant="circular" width={20} height={20} />
                            <Box sx={{ flex: 1 }}>
                              <Skeleton variant="text" width={60} height={14} sx={{ mb: 0.5 }} />
                              <Skeleton variant="text" width="70%" height={18} />
                            </Box>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>

                    <Grid container spacing={1.25}>
                      {Array.from({ length: 2 }).map((_, i) => (
                        <Grid item xs={12} sm={6} key={i}>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1.25,
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: "#f8fafc",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <Skeleton variant="circular" width={20} height={20} />
                            <Box sx={{ flex: 1 }}>
                              <Skeleton variant="text" width={80} height={14} sx={{ mb: 0.5 }} />
                              <Skeleton variant="text" width="50%" height={18} />
                            </Box>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Stack>

                  <Stack spacing={1} sx={{ mt: 2.5 }}>
                    <Stack direction="row" spacing={1}>
                      <Skeleton variant="rectangular" height={36} sx={{ flex: 1, borderRadius: 2 }} />
                      <Skeleton variant="rectangular" height={36} sx={{ flex: 1, borderRadius: 2 }} />
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Skeleton variant="rectangular" height={36} sx={{ flex: 1, borderRadius: 2 }} />
                      <Skeleton variant="rectangular" height={36} sx={{ flex: 1, borderRadius: 2 }} />
                    </Stack>
                  </Stack>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : users.length === 0 ? (
          <Card sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
            <Typography variant="h6" sx={{ color: "#94a3b8" }}>
              No users found in the system.
            </Typography>
          </Card>
        ) : (
          <Grid container spacing={2.5}>
            {users.map((user) => {
              const canDemote =
                user.previousRole && user.role !== user.previousRole;
              const previousLabel = user.previousRole
                ? `Previous: ${user.previousRole}`
                : "";

              return (
                <Grid item xs={12} sm={6} md={6} key={user._id}>
                  <Card
                    sx={{
                      height: "100%",
                      borderRadius: 3,
                      p: 2.5,
                      display: "flex",
                      flexDirection: "column",
                      background: "white",
                      border: "1px solid #e2e8f0",
                      transition: "all 0.3s ease",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      "&:hover": {
                        boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
                        transform: "translateY(-4px)",
                      },
                    }}
                  >
                    {/* User Info */}
                    <Stack spacing={1.5} sx={{ flex: 1, mb: 2.5 }}>
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 700, color: "#1e293b", mb: 0.5 }}
                        >
                          {user.username}
                        </Typography>
                        {user.blocked && (
                          <Chip
                            icon={<BlockIcon />}
                            label="BLOCKED"
                            color="error"
                            size="small"
                            variant="filled"
                            sx={{ fontWeight: 700 }}
                          />
                        )}
                      </Box>

                      <Grid
                        container
                        spacing={1.25}
                        sx={{ fontSize: "0.9rem" }}
                        columns={12}
                      >
                        {/* Email Field */}
                        <Grid item xs={12} sm={12} sx={{width: "100%"}}>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1.25,
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: "#f0f9ff",
                              border: "1px solid #bfdbfe",
                            }}
                          >
                            <EmailIcon
                              sx={{
                                color: "#0284c7",
                                fontSize: 20,
                                flexShrink: 0,
                                mt: 0.25,
                              }}
                            />
                            <Box sx={{ flex: 1, minWidth: 0  }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "#0369a1",
                                  fontWeight: 700,
                                  display: "block",
                                  mb: 0.25,
                                }}
                              >
                                Email
                              </Typography>
                              <Typography
                                sx={{
                                  color: "#334155",
                                  fontSize: "1rem",
                                  fontWeight: 600,
                                  wordBreak: "break-all",
                                }}
                              >
                                {user.email}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                      <Grid
                        container
                        spacing={1.25}
                        sx={{ fontSize: "0.9rem" }}
                        columns={12}
                      >
                      

                        {/* Phone Field */}
                        <Grid item xs={12} sm={6}>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1.25,
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: "#dcfce7",
                              border: "1px solid #86efac",
                            }}
                          >
                            <PhoneIcon
                              sx={{
                                color: "#16a34a",
                                fontSize: 20,
                                flexShrink: 0,
                                mt: 0.25,
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "#15803d",
                                  fontWeight: 700,
                                  display: "block",
                                  mb: 0.25,
                                }}
                              >
                                Phone
                              </Typography>
                              <Typography
                                sx={{
                                  color: "#334155",
                                  fontSize: "0.9rem",
                                  fontWeight: 600,
                                }}
                              >
                                {user.phoneNo || "—"}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>

                          {/* Email Field */}
                        <Grid item xs={12} sm={6}>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1.25,
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: "#f0f9ff",
                              border: "1px solid #bfdbfe",
                            }}
                          >
                            <EmailIcon
                              sx={{
                                color: "#0284c7",
                                fontSize: 20,
                                flexShrink: 0,
                                mt: 0.25,
                              }}
                            />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "#0369a1",
                                  fontWeight: 700,
                                  display: "block",
                                  mb: 0.25,
                                }}
                              >
                                Previous Role
                              </Typography>
                              <Typography
                                sx={{
                                  color: "#334155",
                                  fontSize: "1rem",
                                  fontWeight: 600,
                                  wordBreak: "break-all",
                                }}
                              >
                                {user.previousRole}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                      <Grid
                        container
                        spacing={1.25}
                        sx={{ fontSize: "0.9rem" }}
                        columns={12}
                        justifyContent="center"
                      >
                        {/* Roll No Field */}
                        <Grid item xs={12} sm={6}  >
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1.25,
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: "#fef3c7",
                              border: "1px solid #fcd34d",
                            }}
                          >
                            <BadgeIcon
                              sx={{
                                color: "#d97706",
                                fontSize: 20,
                                flexShrink: 0,
                                mt: 0.25,
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "#92400e",
                                  fontWeight: 700,
                                  display: "block",
                                  mb: 0.25,
                                }}
                              >
                                Roll Number
                              </Typography>
                              <Typography
                                sx={{
                                  color: "#334155",
                                  fontSize: "0.85rem",
                                  fontWeight: 600,
                                }}
                              >
                                {user.rollNo || "—"}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                        {/* Role Field */}
                        <Grid item xs={12} sm={6}>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1.25,
                              p: 1.1,
                              borderRadius: 2,
                              bgcolor: "#ede9fe",
                              border: "1px solid #d8b4fe",
                            }}
                          >
                            <PersonIcon
                              sx={{
                                color: "#7c3aed",
                                fontSize: 20,
                                flexShrink: 0,
                                mt: 0.25,
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "#6d28d9",
                                  fontWeight: 700,
                                  display: "block",
                                  mb: 0.5,
                                }}
                              >
                                Current Role
                              </Typography>
                              <Chip
                                label={user.role.toUpperCase()}
                                size="small"
                                variant="filled"
                                sx={{
                                  bgcolor:
                                    user.role === "student"
                                      ? "#1d4ed8"
                                      : user.role === "staff"
                                      ? "#0f766e"
                                      : "#6b7280",
                                  color: "white",
                                  fontWeight: 600,
                                  fontSize: "0.8rem",
                                }}
                              />
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </Stack>
                    {previousLabel && (
                      <Grid item xs={12}>
                        <Box
                          sx={{
                            p: 1,
                            borderLeft: "3px solid #94a3b8",
                            bgcolor: "#f1f5f9",
                            borderRadius: 1,
                            mb: 2,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#64748b",
                              fontStyle: "italic",
                              fontSize: "0.8rem",
                            }}
                          >
                            {previousLabel}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                    {/* Action Buttons */}
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant={
                            user.role === "student" ? "contained" : "outlined"
                          }
                          size="small"
                          onClick={() =>
                            handleUpdateRole(user._id, user.username, "student")
                          }
                          disabled={
                            updatingId === user._id || user.role === "student"
                          }
                          sx={{
                            flex: 1,
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            borderColor: "#1d4ed8",
                            color:
                              user.role === "student" ? "white" : "#1d4ed8",
                            backgroundColor:
                              user.role === "student"
                                ? "#1d4ed8"
                                : "transparent",
                            "&:hover": {
                              backgroundColor:
                                user.role === "student" ? "#1e40af" : "#eff6ff",
                            },
                          }}
                        >
                          Student
                        </Button>
                        <Button
                          variant={
                            user.role === "staff" ? "contained" : "outlined"
                          }
                          size="small"
                          onClick={() =>
                            handleUpdateRole(user._id, user.username, "staff")
                          }
                          disabled={
                            updatingId === user._id || user.role === "staff"
                          }
                          sx={{
                            flex: 1,
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            borderColor: "#0f766e",
                            color: user.role === "staff" ? "white" : "#0f766e",
                            backgroundColor:
                              user.role === "staff" ? "#0f766e" : "transparent",
                            "&:hover": {
                              backgroundColor:
                                user.role === "staff" ? "#134e4a" : "#f0fdfa",
                            },
                          }}
                        >
                          Staff
                        </Button>
                      </Stack>

                      <Stack direction="row" spacing={1}>
                        <Button
                          variant={user.blocked ? "contained" : "outlined"}
                          size="small"
                          startIcon={<BlockIcon />}
                          onClick={() => handleToggleBlock(user._id)}
                          disabled={updatingId === user._id}
                          sx={{
                            flex: 1,
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            borderColor: user.blocked ? "#dc2626" : "#ea580c",
                            color: user.blocked ? "white" : "#ea580c",
                            backgroundColor: user.blocked
                              ? "#dc2626"
                              : "#fff5ee",
                            "&:hover": {
                              backgroundColor: user.blocked
                                ? "#b91c1c"
                                : "#fff5ee",
                            },
                          }}
                        >
                          {updatingId === user._id
                            ? "..."
                            : user.blocked
                            ? "Unblock"
                            : "Block"}
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<DeleteIcon />}
                          onClick={() =>
                            handleDeleteUser(user._id, user.username)
                          }
                          disabled={updatingId === user._id}
                          sx={{
                            flex: 1,
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            borderColor: "#e11d48",
                            color: "#e11d48",
                            "&:hover": {
                              backgroundColor: "#ffe4e6",
                              borderColor: "#be123c",
                            },
                          }}
                        >
                          {updatingId === user._id ? "..." : "Delete"}
                        </Button>
                      </Stack>
                    </Stack>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() =>
          setDeleteDialog({ open: false, userId: null, username: "" })
        }
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user{" "}
            <strong>"{deleteDialog.username}"</strong>? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setDeleteDialog({ open: false, userId: null, username: "" })
            }
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={confirmDelete}
            disabled={updatingId}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Secret Code Dialog */}
      <Dialog open={secretDialog} onClose={() => setSecretDialog(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Enter Secret Code</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            type="password"
            label="Secret Code"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") confirmSecretCode();
            }}
            placeholder={`Enter code to confirm ${secretAction === "delete" ? "deletion" : "block action"}`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSecretDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmSecretCode}>
            {secretAction === "delete" ? "Delete" : "Block"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
