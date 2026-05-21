# ☁️ Sudoku Cloud Enterprise

![Architecture Diagram](./architecture/diagrama.drawio) *(Ver diagrama adjunto en Draw.io o exportado)*

**Sudoku Cloud Enterprise** no es un Sudoku tradicional. Es una demostración completa de una **arquitectura cloud moderna, altamente disponible, segura y escalable**, diseñada bajo las mejores prácticas de **Amazon Web Services (AWS)** y simulada localmente mediante un orquestador de contenedores.

El proyecto está diseñado para funcionar como un SaaS de videojuegos, capaz de manejar picos de tráfico globales, con persistencia relacional estricta, sistemas de caché de ultra-baja latencia y un balanceo de carga robusto.

---

## 🏗️ Arquitectura y Tecnologías

### 1. Frontend: CDN y Edge Delivery (Simulado con Next.js)
El frontend está construido con **Next.js 13+ y Tailwind CSS**, proporcionando una interfaz moderna (Dark Theme/Glassmorphism) con un peso optimizado. En producción (AWS), los assets estáticos residen en **Amazon S3** y son distribuidos globalmente vía **Amazon CloudFront** (CDN) para garantizar la mínima latencia y protección frente a DDoS.

### 2. Balanceo de Carga (Application Load Balancer - ALB)
Todas las peticiones a la API pasan primero por un balanceador de carga L7 (simulado localmente con **Nginx**). El ALB distribuye las peticiones entrantes hacia el clúster de backend utilizando un algoritmo *Round Robin*.

### 3. Backend: Cómputo Escalable Serverless (ECS Fargate)
La lógica de negocio está construida en **Node.js + Express** (REST API) y empaquetada en contenedores Docker. En la nube, esto opera sobre **Amazon ECS bajo AWS Fargate**.
*   **Escalabilidad Horizontal**: El sistema escala dinámicamente. Localmente simulamos **3 tareas (réplicas)** concurrentes que responden de forma paralela a las peticiones del ALB.
*   **Seguridad**: Rutas protegidas con *Helmet* (seguridad de headers) y *Express Rate Limit* (mitigación DDoS y abuso de API).

### 4. Capa de Persistencia (Amazon RDS PostgreSQL)
Una base de datos robusta para manejar las relaciones entre `users`, `games`, e historial de `scores`. PostgreSQL se ubica en una Subnet Privada, garantizando que **jamás** se exponga a internet.

### 5. Caché de Alta Frecuencia (Amazon ElastiCache / Redis)
Para aliviar a RDS y servir el Global Ranking en milisegundos, los resultados de la base de datos se cachean dinámicamente en **Redis**.

---

## 🔒 Diseño de Seguridad y Red (VPC)

El clúster está aislado en una **Virtual Private Cloud (VPC)** dividida estratégicamente:
*   **Subnets Públicas**: Contienen el ALB (Nginx) y el NAT Gateway.
*   **Subnets Privadas**: Alojan los contenedores de aplicación (Node.js), RDS (PostgreSQL) y ElastiCache (Redis).
*   **Security Groups**: Reglas estrictas aplicadas. El backend *solo* recibe peticiones del ALB, y la BD *solo* recibe peticiones del backend. 

*“Se diseñó una arquitectura cloud moderna, segura, escalable y altamente disponible para un videojuego Sudoku online, aplicando buenas prácticas reales de AWS, contenedores y diseño empresarial.”*

---

## 🚀 Cómo ejecutar la simulación local

Para levantar toda la infraestructura cloud en tu máquina, utilizamos **Docker Compose**. Esto levantará el ALB, 3 nodos de aplicación, PostgreSQL, Redis y el Frontend en redes de puente aisladas.

### Prerrequisitos
* Docker y Docker Compose instalados.

### Ejecución

```bash
docker-compose up --build -d
```

### Verificación de Servicios

1. **Frontend**: [http://localhost:3000](http://localhost:3000) (Next.js)
2. **ALB / Backend Health**: [http://localhost/health](http://localhost/health)
3. **API Endpoints a través del ALB**: `POST http://localhost/api/start-game`

> 💡 **Nota para la simulación HA (Alta Disponibilidad):**  
> Si haces múltiples peticiones a `http://localhost/health`, notarás que el campo `container_id` cambiará, demostrando que el balanceador de carga está enviando tráfico exitosamente a las 3 instancias diferentes del backend de forma Round-Robin.

---

## 📂 Estructura del Proyecto

```text
sudoku-cloud/
│
├── architecture/
│   └── diagrama.drawio      # Diagrama profesional editable de AWS
├── backend/                 # API Node.js/Express (Fargate Simulation)
├── database/                # Scripts de Inicialización PostgreSQL (RDS)
├── docs/                    # Informes Técnicos y PDFs
├── frontend/                # Aplicación Web Next.js (S3/CloudFront)
├── nginx/                   # Configuración del Application Load Balancer
├── docker-compose.yml       # Orquestador de infraestructura completa
└── README.md
```
