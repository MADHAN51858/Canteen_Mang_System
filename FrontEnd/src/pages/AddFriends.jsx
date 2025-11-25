import  { useState, useContext } from 'react'
import { post } from '../utils/api'
import { CartContext } from '../context/CartContext'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
} from '@mui/material'

export default function AddFriends() {
  const [friendUsername, setFriendUsername] = useState('')
  const [msg, setMsg] = useState('')
  const { user } = useContext(CartContext)

  async function AddFriend() {
    setMsg('')
    if (!user || !user._id) return setMsg('You must be logged in')
    if (!friendUsername) return setMsg('Provide friend username')

    const found = await post('/users/findUser', { username: friendUsername })
    if (!found || !found.success || !found.data || found.data.length === 0) {
      return setMsg(found?.message || 'Friend not found')
    }

    const friend = found.data[0]
    const res = await post('/users/addFriends', { userId: user._id, friendIds: [friend._id] })
    if (!res || !res.success) return setMsg(res?.message || 'Failed to add friend')

    setMsg(res.message || 'Friend added')
    setFriendUsername('')
  }

  return (
    <Box display="flex" justifyContent="center" sx={{ mt: 4, px: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420, boxShadow: 4, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Add Friend
          </Typography>

          <TextField
            fullWidth
            label="Friend Username"
            value={friendUsername}
            onChange={e => setFriendUsername(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Button
            fullWidth
            variant="contained"
            onClick={AddFriend}
            sx={{
              py: 1.2,
              textTransform: 'none',
              fontSize: '1rem',
              borderRadius: 2,
            }}
          >
            Add Friend
          </Button>

          {msg && (
            <Alert severity={msg.toLowerCase().includes('fail') ? 'error' : 'success'} sx={{ mt: 2 }}>
              {msg}
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
