## Módulos

### 1. **FileProcessingService**

Este servicio se encarga de la lógica de procesamiento de archivos, incluida la lectura de archivos Excel, el scraping de datos y el envío de mensajes a través de WhatsApp.

#### Métodos Principales

- **processFile(filename: string, message: string, expiration: number, userId: string): Promise<Buffer>**
  - Procesa un archivo Excel, realiza scraping para cada cliente y envía mensajes a través de WhatsApp.
  - Retorna un buffer con los datos de clientes que no tienen deudas.

### 2. **ProcessFileDto**

Este DTO define la estructura de los datos de entrada para el controlador.

#### Propiedades

- **filename: string**
  - Nombre del archivo a procesar.
- **message: string**
  - Mensaje que se enviará a los clientes.
- **expiration: number**
  - Tiempo de expiración para el scraping.

### 3. **Messages Constants**

Este archivo contiene constantes de mensajes que se utilizan en el controlador y en los servicios para facilitar el mantenimiento de los mensajes de texto.

#### Mensajes Incluidos

- **FILE_PROCESSED**: Mensaje cuando el proceso se completa con éxito.
- **ERROR_PROCESSING**: Mensaje en caso de un error durante el procesamiento.
- **PDF_NOT_AVAILABLE**: Mensaje cuando no hay un PDF disponible para un cliente específico.
- **INCOMPLETE_DATA**: Mensaje cuando los datos para un cliente son incompletos.

### 4. **ErrorHandlerService**

Este servicio gestiona los errores y los registros.

#### Métodos Principales

- **handleError(message: string, error: any): void**
  - Registra el error y maneja la lógica adicional para gestionar el error.

### 5. **ProcessController**

Este controlador se encarga de recibir las solicitudes HTTP para procesar archivos y devolver los resultados.

#### Métodos Principales

- **processFile(req: Request, body: ProcessFileDto, res: Response): Promise<void>**
  - Recibe una solicitud para procesar un archivo y envía una respuesta con el resultado del procesamiento.

## Uso



#### Endpoints
- **POST /process/process-file**
- Procesa un archivo Excel y envía mensajes a los clientes.
- Cuerpo de la solicitud (JSON):

{
  "filename": "nombre_del_archivo.xlsx",
  "message": "Mensaje a enviar",
  "expiration": 30
}

