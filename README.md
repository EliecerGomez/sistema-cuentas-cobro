# Sistema de Gestión Administrativa y Generación de Cuentas de Cobro

Aplicación de escritorio para Windows desarrollada para fundaciones y entidades sin ánimo de lucro. Permite administrar colaboradores, parametrizar datos institucionales, emitir automáticamente cuentas de cobro oficiales en formato PDF de alta fidelidad y archivarlas de forma jerárquica en Google Drive y Google Sheets con **costo de infraestructura de $0**.

---

## 1. Qué Hace el Sistema

- **Gestión Integral de Colaboradores:** Registro, edición, búsqueda multicriterio (por nombre, cédula o cargo), ordenamiento y activación/desactivación de colaboradores.
- **Formateo Monetario Estricto para Colombia:** Parseo y validación de valores numéricos o formateados (ej. `1500000`, `1.500.000`, `$1.500.000`), blindado contra apariciones de `$NaN`, `undefined` o `null`.
- **Generación de Cuentas de Cobro en PDF:** Emisión masiva o individual que replica fielmente la plantilla institucional (datos del colaborador, consecutivo destacado en verde esmeralda, caja con NIT institucional, desglose de concepto y fechas de periodo, total a pagar, nota legal del Art. 383 del Estatuto Tributario y línea de firma).
- **Sincronización Cloud Gratuita ($0):**
  - **Google Sheets:** Base de datos relacional gratuita con mapeo dinámico de encabezados.
  - **Google Drive:** Almacenamiento organizado en subcarpetas automáticas por Año y Mes (`CUENTAS DE COBRO/YYYY/MM - Mes/`).
  - **Google Apps Script:** Backend serverless que procesa las solicitudes, maneja la concurrencia y previene duplicados.
- **Historial y Trazabilidad:** Registro atómico de cada cuenta generada con enlaces directos para abrir los PDF alojados en Drive.
- **Aplicación Nativa de Escritorio para Windows:** Ejecución autónoma mediante Electron con aislamiento de contexto (`contextIsolation`), sin requerir abrir navegadores web manualmente ni exponer credenciales privadas.
- **Modo Local / Resiliencia Fuera de Línea:** Si se interrumpe la conexión a Internet o aún no se ha enlazado Google Apps Script, el sistema sigue funcionando de manera local y avisa claramente al usuario sin perder datos.

---

## 2. Tecnologías Empleadas

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Motor de Documentos:** jsPDF (renderizado vectorial de alta precisión).
- **Backend Serverless:** Google Apps Script (V8 Engine).
- **Base de Datos:** Google Sheets.
- **Almacenamiento de Archivos:** Google Drive API (DriveApp).
- **Entorno de Escritorio:** Electron 34, electron-builder (empaquetador NSIS para instalador Windows `.exe`).
- **Pruebas Automatizadas:** Vitest.

---

## 3. Arquitectura del Sistema

```
[ Aplicación de Escritorio Windows (Electron + React + TS) ]
                      |
                      | Peticiones HTTPS (JSON Estandarizado)
                      v
       [ Google Apps Script (Backend Serverless) ]
             |                             |
             v                             v
[ Google Sheets (Base de Datos) ]   [ Google Drive (Carpetas Año/Mes) ]
```

El sistema utiliza una API consistente:
- Respuestas exitosas: `{ "success": true, "data": ... }`
- Respuestas con error: `{ "success": false, "error": "Descripción del error" }`

---

## 4. Cómo Configurar Google Sheets

1. Abre [Google Sheets](https://sheets.new) con tu cuenta de Google.
2. Crea una nueva hoja de cálculo en blanco y nómbrala, por ejemplo: `Base de Datos - Cuentas de Cobro`.
3. Copia el **ID de la hoja de cálculo** desde la barra de direcciones de tu navegador:
   `https://docs.google.com/spreadsheets/d/TU_ID_DE_GOOGLE_SHEETS_AQUI/edit`
4. *Nota importante:* No necesitas crear manualmente las columnas ni las tablas; el script del backend (`Code.gs`) cuenta con una función de auto-inicialización que creará automáticamente las hojas `Colaboradores`, `Configuracion`, `Historial` y `Logs` con sus respectivos encabezados estilizados.

---

## 5. Cómo Configurar Google Apps Script (Backend Serverless)

1. En la hoja de cálculo de Google Sheets que creaste, ve al menú superior: **Extensiones** $\rightarrow$ **Apps Script**.
2. Borra el código existente en el archivo `Código.gs` (o `Code.gs`).
3. Abre el archivo [`google-apps-script/Code.gs`](file:///google-apps-script/Code.gs) de este proyecto, copia todo su contenido y pégalo en el editor de Apps Script.
4. En el editor de Apps Script, abre la pestaña de **Configuración del proyecto** (icono de engranaje a la izquierda) y marca la casilla *"Mostrar el archivo de manifiesto appsscript.json en el editor"*.
5. Vuelve al editor de código, abre `appsscript.json` y asegúrate de que contenga la configuración de [`google-apps-script/appsscript.json`](file:///google-apps-script/appsscript.json).
6. Haz clic en el botón **Implementar** (arriba a la derecha) $\rightarrow$ **Nueva implementación**.
7. Selecciona el tipo de implementación haciendo clic en el engranaje $\rightarrow$ **Aplicación web**.
8. Configura los siguientes valores:
   - **Descripción:** `Backend Cuentas de Cobro v1`
   - **Ejecutar como:** `Yo (tu correo de Google)`
   - **Quién tiene acceso:** `Cualquier usuario` *(Anyone / Incluso anónimos, para permitir la comunicación segura desde el cliente)*
9. Haz clic en **Implementar**.
10. Google te solicitará autorizar los permisos para acceder a Sheets y Drive. Haz clic en *"Revisar permisos"*, selecciona tu cuenta y acepta.
11. Copia la **URL de la aplicación web** generada (termina en `/exec`).

---

## 6. Cómo Configurar Google Drive

1. Ve a [Google Drive](https://drive.google.com).
2. Opcionalmente crea una carpeta llamada `CUENTAS DE COBRO`.
3. Si dejas la configuración por defecto, el sistema creará automáticamente la carpeta raíz `CUENTAS DE COBRO` en la unidad de Google Drive del usuario que implementó el script, y dentro generará automáticamente la estructura jerárquica:
   ```
   CUENTAS DE COBRO/
       2026/
           09 - Septiembre/
               Cuenta de cobro - Juan Pérez - Septiembre 2026.pdf
   ```
4. Si una carpeta ya existe, el sistema la detecta y la reutiliza sin duplicar carpetas.

---

## 7. Cómo Configurar el Frontend

1. Inicia la aplicación (en desarrollo o ejecutable).
2. Ve a la pestaña **Configuración** en el menú lateral.
3. En el campo **URL de la Web App de Google Apps Script**, pega la URL copiada en el paso 5 (terminada en `/exec`).
4. Haz clic en **Probar Conexión con Apps Script** para verificar el enlace en vivo.
5. Haz clic en **Guardar Configuración**.

---

## 8. Cómo Ejecutar en Desarrollo

Asegúrate de contar con Node.js instalado en tu equipo.

```bash
# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo web (Vite)
npm run dev

# Ejecutar suite de pruebas unitarias
npm test
```

---

## 9. Cómo Ejecutar la Aplicación de Escritorio (Electron)

Para iniciar la aplicación como ventana de escritorio nativa conectada en tiempo real:

```bash
npm run electron:dev
```

Esto compilará el proceso de Electron y abrirá la ventana de escritorio en modo seguro (`contextIsolation: true`).

---

## 10. Cómo Generar el Instalador para Windows (`.exe`)

Para crear el paquete instalador oficial `Sistema-Cuentas-Cobro-Setup.exe`:

```bash
npm run electron:build
```

El instalador ejecutable se generará automáticamente en la carpeta `release/`.

---

## 11. Cómo Configurar los Datos Institucionales

Desde la vista de **Configuración**, puedes personalizar los datos oficiales que aparecerán en las cuentas de cobro generadas:
- Nombre Legal de la Fundación (ej. *FUNDACION HOGAR GERIATRICO MIS AÑOS DORADOS*)
- NIT de la entidad (ej. *901481005*)
- Dirección de la sede principal
- Ciudad y departamento
- Teléfono y correo oficial
- Representante legal y su cédula
- Información bancaria institucional

---

## 12. Cómo Utilizar el Sistema

### Paso 1: Registrar o Actualizar Colaboradores
- En la pestaña **Colaboradores**, haz clic en **Nuevo Colaborador**.
- Ingresa consecutivo, cédula, nombre completo, cargo y valor a pagar (ej. `1500000`). El sistema formatea automáticamente a `$ 1.500.000`.

### Paso 2: Generar Cuentas de Cobro
- Ve a **Generar Cuentas**.
- Selecciona el rango del periodo mensual (ej. `01/09/2026` al `30/09/2026`).
- Marca los colaboradores que recibirán cuenta este periodo (puedes usar *"Seleccionar todos"*).
- Haz clic en **GENERAR CUENTAS DE COBRO**.
- El sistema validará los datos, detectará si ya existen cuentas previas para ese periodo/consecutivo, generará los PDF vectoriales y los subirá a Google Drive.

### Paso 3: Consultar el Historial y Descargar
- En el reporte final o en la sección **Historial**, puedes hacer clic en **Abrir PDF** para visualizar el documento directamente en Google Drive o descargarlo a tu equipo.

---

## 13. Solución de Errores Comunes

| Síntoma / Error | Causa Posible | Solución |
| :--- | :--- | :--- |
| **"Modo Local / Sin Conexión"** | No hay Internet o no se ha configurado la URL de Apps Script. | Conéctate a una red e introduce la URL de la Web App en la vista de Configuración. |
| **"El valor a pagar no es válido / $NaN"** | Se introdujo texto no numérico o vacío. | El sistema rechaza automáticamente el guardado. Introduce un número entero válido (ej. `1500000`). |
| **"La fecha final no puede ser anterior a la inicial"** | Rango de fechas invertido. | Ajusta la fecha final para que sea igual o posterior a la inicial. |
| **"Se encontraron cuentas existentes para este periodo"** | Cuenta duplicada detectada. | El modal de advertencia te permitirá decidir si deseas continuar o cancelar para evitar duplicidad. |
| **Error al subir a Google Drive en Apps Script** | Permisos insuficientes en la cuenta de Google. | Vuelve a autorizar los permisos en Apps Script desplegando una nueva versión. |

