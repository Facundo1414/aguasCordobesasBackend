
# Flujo de Login y Controladores Protegidos en NestJS

El flujo de login y el uso de controladores protegidos con guard en NestJS se pueden desglosar en varias etapas clave. Aquí tienes una explicación detallada del flujo de autenticación y cómo usar los controladores protegidos:

## Flujo de Login

### Solicitud de Login:
El cliente envía una solicitud POST a `/auth/login` con el nombre de usuario y la contraseña en el cuerpo de la solicitud.

**Ejemplo de payload:**
```json
{
  "username": "usuario",
  "password": "contraseña"
}
```

### Validación de Credenciales:
El `AuthService` recibe las credenciales y utiliza el `UserService` para buscar al usuario por el nombre de usuario.
Si el usuario no existe o la contraseña no es válida, se lanza una excepción `UnauthorizedException`.

### Generación de Tokens:
Si las credenciales son válidas, se crea un `accessToken` y un `refreshToken` usando `JwtService`. Ambos tokens se devuelven en la respuesta.

### Almacenamiento del Refresh Token:
El refresh token se almacena en la base de datos asociado al usuario para su uso posterior (por ejemplo, para generar nuevos access tokens).

## Uso de Controladores Protegidos

Los controladores que requieren autenticación se pueden proteger utilizando guards. En tu caso, has implementado un `AuthGuard`. Aquí te explico cómo utilizarlos:

### Definición de Controladores Protegidos:
Utiliza el decorador `@UseGuards(AuthGuard('jwt'))` en los controladores que deben estar protegidos.

**Por ejemplo, en el controlador de logout:**
```typescript
@Post('logout')
@UseGuards(AuthGuard('jwt'))
async logout(@Req() request: any) {
  return this.authService.logout(request.user.id);
}
```

### Solicitud a Controladores Protegidos:
Cuando un cliente intenta acceder a un controlador protegido (por ejemplo, `POST /auth/logout`), debe incluir el `accessToken` en el encabezado `Authorization` de la solicitud.

**Ejemplo de cómo enviar la solicitud:**
```
POST /auth/logout
Authorization: Bearer <accessToken>
```

### Validación del Token en el Guard:
En el `AuthGuard`, se extrae el token del encabezado `Authorization` y se valida usando el método `validateToken` del `AuthService`. Si el token es válido, el usuario se adjunta al objeto request y el controlador puede acceder a la información del usuario.

## Ejemplo de Implementación

Aquí tienes un ejemplo simplificado de cómo se verían las peticiones y respuestas:

### Login:

**Request:**
```
POST /auth/login
Content-Type: application/json

{
  "username": "usuario",
  "password": "contraseña"
}
```

**Response (si es exitoso):**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

### Logout:

**Request:**
```
POST /auth/logout
Authorization: Bearer <accessToken>
```

**Response (si es exitoso):**
```json
{
  "message": "Logout successful"
}
```

### Refresh Token:

**Request:**
```
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGci..."
}
```

**Response (si es exitoso):**
```json
{
  "accessToken": "eyJhbGci..."
}
```

## Resumen
El flujo de login implica la validación de credenciales, la generación de tokens y el almacenamiento del refresh token. Los controladores protegidos se aseguran de que solo se acceda a ellos con un token válido a través de guards, permitiendo así un control de acceso adecuado.
