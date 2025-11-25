Quick front-end for DBIT Canteen

Setup

1. Install deps:

   npm install

2. Run dev server:

   npm run dev

Notes
- The frontend calls the backend at VITE_API_BASE (`.env`) or `http://localhost:8000` by default.
- Endpoints used:
  - POST /food/getCategoryItems  { category }
  - POST /users/orderFood  { userDetails, userOrder }
