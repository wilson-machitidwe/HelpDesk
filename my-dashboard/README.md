# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## LAN Access (Other Machines)

To access the app from another machine on the same network:

1. Ensure Vite binds to all interfaces (already set in `vite.config.js`):
   `server.host = '0.0.0.0'`
2. Set the API base URL in `my-dashboard/.env`:
   `VITE_API_BASE=http://<YOUR_PC_LAN_IP>:4000`
3. Start the frontend:
   `npm run dev`
4. Start the backend:
   `node server/index.js` (or whatever backend start command you use)
5. Open from another machine:
   `http://<YOUR_PC_LAN_IP>:5173`

Notes:
- Allow inbound TCP on ports `5173` (frontend) and `4000` (backend) in Windows Firewall.
- The backend already listens on all interfaces by default with `app.listen(PORT)`.

### Troubleshooting

- Login works on localhost but not another machine:
  - Ensure `VITE_API_BASE` is set to `http://<YOUR_PC_LAN_IP>:4000` in `my-dashboard/.env`.
  - Restart the Vite dev server after changing `.env`.
- Frontend loads but API calls fail:
  - Verify backend is running on the host machine and reachable at `http://<YOUR_PC_LAN_IP>:4000`.
  - Check Windows Firewall inbound rules for ports `4000` and `5173`.
- Other machine can’t load the site at all:
  - Confirm both devices are on the same network.
  - Use `ipconfig` on the host to confirm the LAN IP.

### Setup Checklist

1. Install dependencies:
   `npm install`
2. Configure frontend API base (LAN or local):
   Copy `.env.example` to `.env` and update:
   `VITE_API_BASE=http://<YOUR_PC_LAN_IP>:4000`
3. Start backend:
   `node server/index.js`
4. Start frontend:
   `npm run dev`
5. Open app:
   `http://<YOUR_PC_LAN_IP>:5173` or `http://localhost:5173`

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
