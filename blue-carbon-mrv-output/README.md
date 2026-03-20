# 🌊 Blue Carbon MRV Platform

**Measuring, Reporting & Verifying blue carbon restoration projects.**  
Built for the National Centre for Coastal Research (NCCR), India.

---

## Modules

| Module | Tech | Description |
|--------|------|-------------|
| `frontend/admin` | HTML/CSS/JS | Admin & Verifier web dashboard |
| `frontend/mobile` | HTML/CSS/JS | Field worker mobile app |
| `backend` | Node.js, Express | REST API server |
| `database` | PostgreSQL | Persistent data store |
| `blockchain` | Solidity, Hardhat | Smart contract & deployment |

---

## Quick Start (Standalone — No Installation)

1. Open `frontend/admin/index.html` in Chrome
2. Open `frontend/mobile/index.html` in another tab (same browser)
3. Admin key: **`NCCR2024ADMIN`**

See `docs/SETUP.md` for full stack setup with Node.js + PostgreSQL.

---

## Key Credentials

| Item | Value |
|------|-------|
| Admin Key | `NCCR2024ADMIN` |
| API Port | `3001` |
| Blockchain | Hardhat Testnet (Chain ID 31337) |
| Token | BCT — 1 token = 1 tonne CO₂e |

---

## Documentation

- `docs/SETUP.md` — Full setup & run guide
- `docs/API.md`   — REST API reference
