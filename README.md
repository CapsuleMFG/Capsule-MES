# Capsule ERP - Manufacturing ERP System

A modern, full-stack manufacturing ERP system built for tracking jobs through a 4-stage workflow (Engineering → WO Release → Materials → Production).

![Tech Stack](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Node.js](https://img.shields.io/badge/Node.js-20-green)
![SQLite](https://img.shields.io/badge/SQLite-3-lightgrey)

## 🎯 Features

- **Dashboard**: Real-time metrics showing active jobs, critical jobs, material issues, and total labor hours
- **Job Management**: Create, track, and manage manufacturing jobs with auto-generated job numbers (CAP-YYYY-XXX)
- **4-Stage Workflow**: Track jobs through Engineering, WO Release, Materials, and Production stages
- **Material Tracking**: Bill of Materials (BOM) management with status tracking (Needed, Ordered, Received, Issued)
- **Labor Tracking**: Log and track labor hours by employee, date, and workflow stage
- **Priority Management**: Critical, High, Medium, and Low priority levels with color-coded badges
- **Real-time Updates**: React Query integration for optimistic updates and cache management
- **Dark Theme**: Modern, professional dark theme based on Rivian design system

## 🚀 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Query** for state management and caching
- **Axios** for API calls
- **Headless UI** for accessible components
- **Lucide React** for icons

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **SQLite** (via sql.js) for database
- **Helmet** for security
- **CORS** for cross-origin requests
- **Winston** for logging

## 📋 Prerequisites

- Node.js 18+ and npm
- Git

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd capsule-erp
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../client
npm install --legacy-peer-deps
```

## 🏃 Running the Application

### Start Backend Server (Port 3001)

```bash
cd server
npm run dev
```

The backend will:
- Initialize the SQLite database
- Run migrations and seed sample data
- Start on http://localhost:3001
- API available at http://localhost:3001/api

### Start Frontend Development Server (Port 5173)

In a new terminal:

```bash
cd client
npm run dev
```

The frontend will be available at http://localhost:5173

## 📊 Sample Data

The database is pre-seeded with:
- **5 Jobs** (CAP-2025-001 through CAP-2025-005)
- **5 Clients** (Lennar Homes, DR Horton, Pulte Homes, KB Home, Taylor Morrison)
- **4 Workflow Stages** (Engineering, WO Release, Materials, Production)
- **9 Materials** entries
- **9 Labor** entries

## 🎨 Application Structure

```
capsule-erp/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── layout/    # AppLayout, Sidebar
│   │   │   ├── dashboard/ # Dashboard components
│   │   │   ├── jobs/      # Job-related components
│   │   │   │   └── tabs/  # Job detail tabs
│   │   │   └── ui/        # Base UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API service layer
│   │   └── types/         # TypeScript types
│   └── package.json
│
├── server/                # Node.js backend
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   └── server.ts      # Express app
│   ├── database/
│   │   ├── migrations/    # SQL migrations
│   │   └── capsule_erp.db # SQLite database
│   └── package.json
│
└── shared/                # Shared TypeScript types
    └── types/
```

## 🔑 Key Features & Usage

### Creating a New Job

1. Click "New Job" button in the header
2. Fill in the form:
   - Select a client
   - Enter description
   - Set priority (Critical/High/Medium/Low)
   - Optional: Target date, estimated hours, notes
3. Click "Create Job"
4. Job number is auto-generated (e.g., CAP-2025-006)

### Updating Workflow Status

1. Navigate to a job detail page
2. Click on any workflow stage badge
3. Update status, assignee, and notes
4. Status options:
   - Not Started (gray)
   - In Progress (yellow)
   - Completed (green)
   - Blocked (red)

### Managing Materials

1. Go to job detail page → BOM/Materials tab
2. Click "Add Material"
3. Enter material details (name, quantity, unit, supplier)
4. Update status as materials are ordered/received
5. Delete materials as needed

### Tracking Labor

1. Go to job detail page → Production tab
2. Click "Add Labor Entry"
3. Enter employee name, hours, date, and notes
4. Labor hours automatically update job's actual hours
5. View total hours logged at top of tab

## 📡 API Endpoints

### Jobs
- `GET /api/jobs` - List all jobs (with filters)
- `POST /api/jobs` - Create new job
- `GET /api/jobs/:id` - Get job details
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job

### Workflow
- `GET /api/jobs/:id/workflow` - Get workflow progress
- `PUT /api/jobs/:id/workflow/:stageId` - Update stage status
- `GET /api/workflow/stages` - Get all workflow stages

### Materials
- `GET /api/jobs/:id/materials` - Get job materials
- `POST /api/jobs/:id/materials` - Add material
- `PUT /api/jobs/:id/materials/:materialId` - Update material
- `DELETE /api/jobs/:id/materials/:materialId` - Delete material

### Labor
- `GET /api/jobs/:id/labor` - Get labor entries
- `POST /api/jobs/:id/labor` - Add labor entry
- `DELETE /api/jobs/:id/labor/:laborId` - Delete labor entry

### Dashboard
- `GET /api/dashboard/metrics` - Get dashboard metrics

### Clients
- `GET /api/clients` - List all clients
- `POST /api/clients` - Create client
- `GET /api/clients/:id` - Get client details

## 🎨 Design System

### Colors

**Background:**
- Primary: `#1C2422` (rivian-black)
- Secondary: `#2A3230` (rivian-soft-black)
- Hover: `#353D3B`

**Accent:**
- Accent Blue: `#2D9CFF`

**Priority:**
- Critical: `#EF4444` (red)
- High: `#F97316` (orange)
- Medium: `#EAB308` (yellow)
- Low: `#9CA3AF` (gray)

**Workflow Stages:**
- Engineering: `#3B82F6` (blue)
- WO Release: `#8B5CF6` (purple)
- Materials: `#F59E0B` (amber)
- Production: `#10B981` (green)

**Status:**
- Not Started: `#6B7280` (gray)
- In Progress: `#EAB308` (yellow)
- Completed: `#10B981` (green)
- Blocked: `#EF4444` (red)

## 🧪 Testing

### Manual Testing Scenarios

**Scenario 1: Create and Track a Job**
1. Open dashboard - verify metrics
2. Click "+ New Job"
3. Fill form and submit
4. Verify job appears in jobs list with CAP-2025-XXX number
5. Click job card to open details
6. Update workflow stages
7. Verify dashboard metrics update

**Scenario 2: Manage Materials**
1. Open job detail → Materials tab
2. Add materials
3. Update material status from Needed → Ordered → Received
4. Verify dashboard Material Issues count changes
5. Delete a material

**Scenario 3: Track Labor**
1. Open job detail → Production tab
2. Add labor entries
3. Verify total hours updates
4. Verify job actual hours updates on Overview tab

## 🔒 Environment Variables

### Backend (.env)
```env
PORT=3001
DATABASE_PATH=./database/capsule_erp.db
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api
```

## 📦 Building for Production

### Backend
```bash
cd server
npm run build
npm start
```

### Frontend
```bash
cd client
npm run build
# Serve the dist/ folder with your preferred static file server
```

## 🐛 Troubleshooting

**Issue: Frontend not connecting to backend**
- Ensure backend is running on port 3001
- Check CORS settings in server/.env
- Verify VITE_API_URL in client/.env

**Issue: Database errors**
- Delete server/database/capsule_erp.db
- Restart server to recreate database with migrations

**Issue: CSS/Tailwind not working**
- Ensure tailwind.config.js is present
- Check postcss.config.js exists
- Restart Vite dev server

## 📝 License

MIT License - see LICENSE file for details

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 🎯 Future Enhancements

- [ ] User authentication and authorization
- [ ] Multi-tenant support
- [ ] Advanced reporting and analytics
- [ ] PDF export for work orders
- [ ] Email notifications
- [ ] Mobile app
- [ ] Production scheduling
- [ ] Capacity planning
- [ ] MRP (Material Requirements Planning)
- [ ] Integration with accounting systems

## 📞 Support

For issues and questions, please create an issue in the GitHub repository.

---

**Built with ❤️ for modern manufacturing**
