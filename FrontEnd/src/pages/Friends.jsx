
import { useState } from "react";
import { post } from "../utils/api";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
} from "@mui/material";

export default function Friends() {
  const [username, setUsername] = useState("");
  const [friends, setFriends] = useState([]);

  async function fetchFriends() {
    const res = await post("/users/getFreiendsList", { username });
    if (res && res.data) setFriends(res.data);
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f4f6f8",
        p: { xs: 2, sm: 3 },
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 500,
          borderRadius: 3,
        }}
      >
        <Typography variant="h4" fontWeight={600} textAlign="center" mb={3}>
          Friends
        </Typography>

        <TextField
          fullWidth
          label="Enter Username"
          variant="outlined"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          fullWidth
          onClick={fetchFriends}
          sx={{ py: 1.2, borderRadius: 2, fontSize: "1rem" }}
        >
          Get Friends
        </Button>

        {/* Friends List */}
        {friends.length > 0 && (
          <List sx={{ mt: 3, bgcolor: "background.paper", borderRadius: 2 }}>
            {friends.map((f) => (
              <ListItem key={f._id}>
                <ListItemAvatar>
                  <Avatar>{f.username?.charAt(0).toUpperCase()}</Avatar>
                </ListItemAvatar>
                <ListItemText primary={f.username} secondary={f.email} />
              </ListItem>
            ))}
          </List>
        )}

        {friends.length === 0 && (
          <Typography
            variant="body2"
            textAlign="center"
            mt={3}
            color="text.secondary"
          >
            No friends to show
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
