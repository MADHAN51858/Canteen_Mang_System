import { useState, useEffect } from "react";
import { post } from "../utils/api";
import { useToast } from "../hooks/useToast";
import "../styles/Users.css";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
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
        const visible = all.filter((u) => !(u.role === "admin" && u.previousRole === "admin"));
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
    try {
      setUpdatingId(userId);
      const response = await post("/users/toggleBlockUser", { userId });

      if (response.success) {
        const updated = response.data;
        setUsers((prev) => prev.map((u) => (u._id === userId ? updated : u)));
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
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

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

  if (loading) {
    return <div className="users-container"><p>Loading users...</p></div>;
  }

  return (
    <div className="users-container">
      <h1>Manage Roles</h1>
      
      {users.length === 0 ? (
        <p className="no-users">No students found in the system.</p>
      ) : (
        <div className="students-grid">
          {users.map((user) => {
            const canDemote = user.previousRole && user.role !== user.previousRole;
            const previousLabel = user.previousRole ? `Previous: ${user.previousRole}` : "";

            return (
              <div key={user._id} className="student-card">
                <div className="student-info">
                  <h3>{user.username}</h3>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Roll No:</strong> {user.rollNo}</p>
                  <p><strong>Phone:</strong> {user.phoneNo}</p>
                  <p><strong>Role:</strong> <span className="role-badge">{user.role}</span></p>
                  {user.blocked && <p className="blocked-status" style={{ color: "red", fontWeight: "bold" }}>🚫 BLOCKED</p>}
                  {previousLabel && <p className="prev-role">{previousLabel}</p>}
                </div>
                <div className="action-buttons">
                  <button
                    className="promote-btn"
                    onClick={() => handleUpdateRole(user._id, user.username, "student")}
                    disabled={updatingId === user._id || user.role === "student"}
                  >
                    {updatingId === user._id ? "Updating..." : "Set Student"}
                  </button>
                  <button
                    className="promote-btn"
                    onClick={() => handleUpdateRole(user._id, user.username, "staff")}
                    disabled={updatingId === user._id || user.role === "staff"}
                  >
                    {updatingId === user._id ? "Updating..." : "Set Staff"}
                  </button>
                  <button
                    className="promote-btn"
                    onClick={() => handleUpdateRole(user._id, user.username, "admin")}
                    disabled={updatingId === user._id || user.role === "admin"}
                  >
                    {updatingId === user._id ? "Updating..." : "Set Admin"}
                  </button>
                  <button
                    className={user.blocked ? "unblock-btn" : "block-btn"}
                    onClick={() => handleToggleBlock(user._id)}
                    disabled={updatingId === user._id}
                  >
                    {updatingId === user._id ? "Updating..." : user.blocked ? "Unblock User" : "Block User"}
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteUser(user._id, user.username)}
                    disabled={updatingId === user._id}
                  >
                    {updatingId === user._id ? "Deleting..." : "Delete User"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
