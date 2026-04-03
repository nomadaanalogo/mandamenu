import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      // Páginas dinámicas se guardan en el router cache del browser por 30 seg.
      // Navegar entre Menú/Pedidos/Sedes/Ventas dentro de 30s es instantáneo.
      dynamic: 30,
    },
  },
};

export default nextConfig;
