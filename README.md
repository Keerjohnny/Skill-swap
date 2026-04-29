# Student Mentorship Platform

Full-stack MERN application for connecting students with mentors through scheduled sessions, skill matching, and offline learning content.

## Stack

- Frontend: React 18, Vite, React Router, Axios
- Backend: Node.js, Express, Mongoose, JWT, Multer
- Database: MongoDB

## Project Structure

```text
client/   React frontend
server/   Express API
.env      Server environment variables
```

## Setup

1. Install backend dependencies:

   ```bash
   cd server
   npm install
   ```

2. Install frontend dependencies:

   ```bash
   cd ../client
   npm install
   ```

3. Update [.env](.env) with your MongoDB connection string and JWT secret.

4. Start the backend:

   ```bash
   cd server
   npm run dev
   ```

5. Start the frontend in a second terminal:

   ```bash
   cd client
   npm run dev
   ```

## Default Runtime URLs

- API: http://localhost:5000/api
- Frontend: http://localhost:5173

## Implemented Features

- JWT-based registration and login for student, mentor, and admin roles
- Role-aware dashboards and protected routing
- User profile management with skills and availability
- Session scheduling, shareable session links, and review support
- Skill directory with mentor matching
- Admin content management with URL or file upload support

## Notes

- The included [.env](.env) uses a local MongoDB placeholder.
- Uploaded content files are served from `server/uploads`.
- Join-session links are public and resolve through `/session/join/:linkId`.