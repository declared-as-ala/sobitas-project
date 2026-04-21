# SOBITAS Admin - Access Guide

## 🎯 How to Access the Different Admin Panels

### 1. **Voyager Admin (Legacy/Old Dashboard)**
- **URL**: `http://localhost:8080/admin`
- **What it is**: The original Voyager admin panel with the enhanced dashboard
- **Features**: All existing functionality (Tickets, Factures, BL, Quotations, etc.)
- **Design**: Modern CSS applied via `dashboard-modern.css`

### 2. **Filament Admin (New Modern Dashboard)** ⭐
- **URL**: `http://localhost:8080/admin-filament`
- **What it is**: Brand new Filament admin with modern UI/UX
- **Features**:
  - ✅ Light/Dark mode toggle
  - ✅ Modern sidebar with animations
  - ✅ Enhanced KPI widgets with charts
  - ✅ Quick Actions widget
  - ✅ Sales trend charts (30 days)
  - ✅ Revenue by source (doughnut chart)
  - ✅ Recent orders table
  - ✅ Top products widget
  - ✅ All CRUD resources (Users, Roles, Products, Clients, Orders, etc.)

### 3. **Homepage**
- **URL**: `http://localhost:8080/`
- **Redirects to**: `/admin` (Voyager)

---

## 📊 Comparison

| Feature | Voyager Admin (`/admin`) | Filament Admin (`/admin-filament`) |
|---------|--------------------------|-----------------------------------|
| **Dashboard** | Enhanced with Tailwind | Modern with Filament widgets |
| **Dark Mode** | ❌ No | ✅ Yes |
| **Widgets** | Basic stats | Advanced with charts |
| **UI/UX** | Voyager default | Modern Filament |
| **Navigation** | Voyager sidebar | Modern collapsible sidebar |
| **Resources** | BREADs | Filament Resources |
| **Forms** | Page-based | Modal-based |
| **Tables** | Basic | Advanced with filters |

---

## 🚀 Recommended Usage

### For Daily Operations:
**Use Filament Admin** (`/admin-filament`)
- Better UX
- Faster operations (modals)
- Modern design
- Dark mode support
- Better visualizations

### For Legacy Features:
**Use Voyager Admin** (`/admin`)
- Custom print templates
- Existing custom pages
- Legacy workflows

---

## 🔐 Login

Both admin panels use the **same authentication**:
- Use your existing admin credentials
- Auth is shared between both systems

---

## 📱 Mobile Support

Both admin panels are fully responsive and work on mobile devices.

---

## 🎨 Dark Mode (Filament only)

Toggle dark mode in Filament by clicking the **sun/moon icon** in the top-right corner.

---

## 🛠️ Technical Details

### Routes Structure:
- **Voyager**: `/admin/*` (57 routes)
- **Filament**: `/admin-filament/*` (18+ routes)

### Panel IDs:
- **Voyager**: Main system (Voyager::routes())
- **Filament**: Registered via AdminPanelProvider

### Why Two Paths?
To avoid conflicts during migration. Both panels coexist:
- **Voyager** keeps `/admin` for existing workflows
- **Filament** uses `/admin-filament` for new modern interface
- No functionality is lost
- Gradual transition possible

---

## ✅ Next Steps

1. **Access Filament**: Go to `http://localhost:8080/admin-filament`
2. **Login**: Use your admin credentials
3. **Explore**: Check out the new dashboard and widgets
4. **Toggle Dark Mode**: Click the theme toggle in top-right
5. **Try Features**: Create/edit records using the modal-based interface

---

## 🎯 Future Migration Plan

Once you're comfortable with Filament:
1. Test all features in Filament
2. Migrate remaining custom pages
3. Update internal links to point to Filament
4. Eventually replace Voyager completely
5. Change Filament path from `/admin-filament` to `/admin`

For now, both systems work side-by-side! 🎉
