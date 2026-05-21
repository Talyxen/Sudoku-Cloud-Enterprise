# Informe Técnico: Arquitectura Enterprise Sudoku Cloud

## 1. Resumen Ejecutivo
El presente documento detalla el diseño y la implementación de una arquitectura cloud moderna, segura, escalable y altamente disponible para la plataforma de videojuegos **Sudoku Enterprise**. Aplicando buenas prácticas reales de la industria y servicios administrados de AWS, se ha diseñado una infraestructura orientada a microservicios utilizando contenedores serverless, distribución de carga y seguridad perimetral para soportar picos de tráfico globales con baja latencia y alta tolerancia a fallos.

---

## 2. Diseño de Red y Conectividad (VPC)
La base de la infraestructura se asienta sobre una **Virtual Private Cloud (VPC)** aislada lógicamente, aplicando el principio de mínimo privilegio.

*   **Subnets Públicas**: Alojan los recursos que requieren acceso directo desde/hacia internet, específicamente el **Application Load Balancer (ALB)** y el **NAT Gateway**.
*   **Subnets Privadas**: Alojan los componentes críticos (Lógica de negocio en **ECS** y la capa de persistencia en **RDS/ElastiCache**). 

**Justificación Técnica**: Esta arquitectura desacoplada garantiza que la base de datos y los servidores de aplicaciones jamás se expongan directamente a internet. Para que las instancias privadas puedan descargar actualizaciones de paquetes o conectarse a otros servicios AWS, el tráfico de salida es enrutado a través del **NAT Gateway** ubicado en la subnet pública.

---

## 3. Seguridad Perimetral y Control de Acceso
El modelo de seguridad se fundamenta en un esquema estricto de **Security Groups** actuando como firewalls stateful a nivel de instancia/contenedor:

1.  **ALB Security Group**: Permite únicamente tráfico entrante en los puertos `HTTP (80)` y `HTTPS (443)` desde el exterior (`0.0.0.0/0`).
2.  **ECS Backend Security Group**: Permite el tráfico entrante al puerto `3000` **SOLO** desde el Security Group del ALB. Esto bloquea cualquier intento de ataque directo a los contenedores.
3.  **RDS PostgreSQL Security Group**: Permite acceso al puerto `5432` **EXCLUSIVAMENTE** desde el Security Group de las tareas ECS. El acceso desde internet está totalmente denegado.

Además, los secretos (contraseñas de la DB, API keys) son inyectados mediante **AWS Secrets Manager**, evitando hardcodear credenciales en el código fuente.

---

## 4. Distribución de Carga y Entrega de Contenido

### Application Load Balancer (ALB)
Las peticiones de los usuarios son recibidas por el ALB, que opera en la capa 7 (HTTP/HTTPS) del modelo OSI. Utiliza un algoritmo de enrutamiento **Round Robin** para distribuir el tráfico equitativamente entre múltiples tareas ECS, garantizando una alta disponibilidad.

### Content Delivery Network (CDN) & Almacenamiento Estático
*   **Amazon S3**: Almacena los assets estáticos del frontend (imágenes, bundles de Next.js, CSS).
*   **Amazon CloudFront**: Actúa como CDN global. Distribuye el contenido desde ubicaciones perimetrales (Edge Locations) reduciendo drásticamente la latencia para usuarios internacionales y absorbiendo posibles ataques DDoS.

---

## 5. Cómputo y Escalabilidad Horizontal (ECS Fargate)
Para el procesamiento lógico (Backend API en Node.js), se emplea **Amazon ECS** bajo el motor **Fargate**.

**Justificación Técnica**: Fargate es una solución serverless para contenedores. Elimina la necesidad de aprovisionar, configurar o escalar clústeres de máquinas virtuales (EC2). 
El sistema está configurado con reglas de **Auto Scaling**:
*   *Mínimo*: 2 tareas (garantiza alta disponibilidad).
*   *Máximo*: 10 tareas.
*   *Política*: Si el consumo de CPU supera el 70% durante 3 minutos, Auto Scaling aprovisiona automáticamente nuevas instancias (escalado horizontal dinámico).

---

## 6. Capa de Datos (Persistencia y Caché)

### Amazon RDS (PostgreSQL)
Se eligió PostgreSQL como base de datos relacional.
**Justificación**: Su robustez lo hace ideal para mantener relaciones estructuradas complejas, integridad referencial de usuarios, historiales de partidas y consultas transaccionales. Se configura en modo *Multi-AZ* para replicación síncrona y tolerancia a fallos.

### Amazon ElastiCache (Redis)
Para reducir la carga sobre la base de datos RDS y acelerar las consultas frecuentes (como la obtención del *Leaderboard* o Global Ranking), se implementó un clúster de Redis. Las lecturas de alta concurrencia responden en menos de un milisegundo.

---

## 7. Observabilidad y Monitoreo (CloudWatch)
Todos los logs transaccionales, métricas de rendimiento (CPU/Memoria de Fargate, conexiones activas de RDS, latencia del ALB) son centralizados en **Amazon CloudWatch**, permitiendo la configuración de alarmas tempranas.

---

## 8. Simulación del Entorno Local
Para propósitos de desarrollo y prueba de este diseño empresarial, se ha provisto un `docker-compose.yml` que simula la infraestructura descrita:
*   Una red puente (`public_subnet`, `private_subnet`).
*   **Nginx** operando como Application Load Balancer.
*   `deploy: replicas: 3` simulando un clúster de múltiples tareas ECS Fargate.
*   Instancias locales de **PostgreSQL** y **Redis** en las redes privadas.
*   Políticas estrictas de reinicio (`restart_policies`) y `healthchecks`.

## 9. Conclusión
Se diseñó una arquitectura cloud moderna, segura, escalable y altamente disponible para un videojuego Sudoku online, aplicando buenas prácticas reales de AWS, contenedores y diseño empresarial.
