# Sistema de Autenticación de Usuarios

Este proyecto implementa un sistema básico de autenticación de usuarios utilizando **NestJS**, con contraseñas encriptadas mediante **bcrypt** y **JWT (JSON Web Tokens)** para la autenticación basada en tokens.

## Tecnologías utilizadas

- **NestJS**: Framework para construir aplicaciones de servidor en Node.js.
- **bcrypt**: Para encriptar las contraseñas de los usuarios.
- **JWT (jsonwebtoken)**: Para manejar la autenticación basada en tokens.
- **Passport**: Biblioteca de autenticación modular, usada con la estrategia `passport-jwt`.

## Flujo de Autenticación de Usuarios

### 1. **Registro o Creación de Usuarios**
   - El administrador es responsable de crear usuarios, ya que no se implementa un sistema de registro abierto.
   - Los usuarios se pueden crear manualmente en el array de usuarios en el archivo `UsersService`, o utilizando la ruta `/users/create` si se habilita (solo accesible para el administrador).
   - Las contraseñas se encriptan usando `bcrypt` antes de almacenarlas en la lista de usuarios.

### 2. **Login (Iniciar Sesión)**
   - Para iniciar sesión, un usuario debe enviar una solicitud POST a `/auth/login` con su nombre de usuario y contraseña en el cuerpo de la solicitud.
   - Ejemplo de solicitud:
     ```json
     {
       "username": "admin",
       "password": "admin123"
     }
     ```
   - El servicio de autenticación (`AuthService`) valida las credenciales del usuario:
     1. Busca al usuario por su nombre de usuario usando el servicio `UsersService`.
     2. Compara la contraseña ingresada con la contraseña almacenada utilizando `bcrypt`.
     3. Si las credenciales son correctas, genera un token JWT para el usuario.

### 3. **Generación del Token JWT**
   - Si las credenciales son válidas, el servicio genera un **JWT** usando la biblioteca `jsonwebtoken`.
   - El token incluye información del usuario (como el `username` y el `sub` que es el ID del usuario) y se firma utilizando una clave secreta definida en las variables de entorno (`JWT_SECRET`).
   - El token devuelto puede usarse para autenticar futuras solicitudes.
   - Ejemplo de respuesta exitosa:
     ```json
     {
       "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     }
     ```

### 4. **Autenticación de Rutas Protegidas**
   - Para acceder a rutas protegidas, el cliente debe incluir el token JWT en el encabezado de la solicitud con el formato `Bearer <token>`.
   - Ejemplo de solicitud:
     ```http
     GET /profile
     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```
   - El `JwtStrategy` verifica la validez del token. Si el token es válido:
     1. Se descifra el token para obtener los datos del usuario (como el `id`).
     2. El usuario autenticado se adjunta a la solicitud y se puede acceder a él en los controladores protegidos.

### 5. **Protección de Rutas con Guards**
   - El `JwtAuthGuard` protege las rutas que requieren autenticación. Solo los usuarios con un token JWT válido pueden acceder a estas rutas.
   - Ejemplo de una ruta protegida:
     ```typescript
     @UseGuards(JwtAuthGuard)
     @Get('profile')
     getProfile(@Request() req) {
       return req.user;
     }
     ```

## Rutas Disponibles

### 1. **Autenticación**

| Método | Ruta          | Descripción                       |
|--------|---------------|-----------------------------------|
| POST   | `/auth/login` | Inicia sesión con usuario y contraseña, devuelve un JWT. |

### 2. **Usuarios**

| Método | Ruta              | Descripción                                   |
|--------|-------------------|-----------------------------------------------|
| POST   | `/users/create`    | (Opcional) Crea un nuevo usuario.            |
| GET    | `/users`           | (Opcional) Obtiene la lista de usuarios.     |
| GET    | `/users/:username` | (Opcional) Obtiene detalles de un usuario.   |

### 3. **Rutas Protegidas**

| Método | Ruta         | Descripción                         |
|--------|--------------|-------------------------------------|
| GET    | `/profile`   | Devuelve los datos del perfil del usuario autenticado. |

## Seguridad

- **bcrypt** se utiliza para encriptar contraseñas, protegiendo los datos sensibles de los usuarios.
- **JWT** asegura que solo los usuarios autenticados puedan acceder a las rutas protegidas.
- El token JWT tiene una firma basada en una clave secreta que asegura su validez.

## Variables de Entorno

Asegúrate de tener configuradas las siguientes variables de entorno:

```bash
JWT_SECRET=mysecretkey



Ejemplo de Uso
Crear un usuario (opcional):

Puedes crear un usuario directamente en el array de usuarios dentro de UsersService o utilizar la ruta /users/create.
Iniciar sesión:

Envía una solicitud POST a /auth/login con el nombre de usuario y contraseña.
Guarda el token JWT que se recibe en la respuesta.
Acceder a rutas protegidas:

Envía el token JWT en el encabezado Authorization para acceder a rutas como /profile.