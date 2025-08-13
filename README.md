# Extractor y Analizador de Datos Climáticos de AEMET

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Este proyecto es un script de Node.js diseñado para descargar, procesar y analizar datos climatológicos diarios de la [API Opendata de AEMET](https://opendata.aemet.es/centro-de-descargas/inicio). Ofrece una interfaz de línea de comandos (CLI) interactiva para facilitar su configuración y ejecución.

## ✨ Características Principales

-   **Descarga por Estaciones**: Permite descargar datos para una o varias estaciones meteorológicas a la vez.
-   **Manejo de Rangos Largos**: Divide automáticamente las peticiones en rangos de 6 meses para cumplir con las limitaciones de la API de AEMET.
-   **Robustez**: Implementa una política de reintentos automática para gestionar errores de red y el *rate limiting* de la API (error 429).
-   **Normalización de Datos**: Limpia y formatea los datos brutos de la API a un formato consistente y fácil de usar.
-   **Análisis Avanzado**: Genera resúmenes estadísticos mensuales y anuales, calculando promedios, máximos y mínimos para las principales variables climáticas.
-   **Salida Organizada**: Guarda los resultados en ficheros CSV, creando una carpeta dedicada para cada estación procesada que contiene los datos diarios, el análisis mensual y el análisis anual.
-   **CLI Interactiva**: Guía al usuario a través de la configuración inicial (API Key, estaciones, fechas) para un uso sencillo.

## 📂 Estructura del Proyecto

El código está modularizado para facilitar su mantenimiento y escalabilidad.

```
.
├── services/               # Módulos que interactúan con servicios externos.
│   ├── aemetApi.js         # Lógica para las llamadas a la API de AEMET.
│   └── csvWriter.js        # Lógica para generar y guardar ficheros CSV.
├── utils/                  # Funciones de utilidad y procesamiento de datos.
│   ├── consoleLogger.js    # Utilidades para mostrar mensajes con estilo en la consola.
│   ├── dataAnalyzer.js     # Funciones para el análisis mensual y anual de los datos.
│   ├── dataProcessor.js    # Funciones para normalizar y deduplicar datos.
│   └── dateUtils.js        # Utilidades para el manejo de fechas.
├── config.js               # Parámetros y constantes globales del script.
├── main.js                 # Orquestador principal que procesa cada estación.
├── index.js                # Punto de entrada del script, maneja la interacción con el usuario.
├── package.json            # Definición del proyecto y sus dependencias.
└── README.md               # Este fichero.
```

## 🚀 Requisitos

1.  **Node.js**: Se recomienda la versión **v18.x** o superior. Puedes descargarlo desde [nodejs.org](https://nodejs.org/).
2.  **API Key de AEMET**: Necesitas una clave de API para acceder a los datos. Puedes obtenerla de forma gratuita registrándote en [AEMET Opendata](https://opendata.aemet.es/centro-de-descargas/alta-usuario).

## ⚙️ Instalación

Sigue estos pasos para poner en marcha el proyecto:

1.  **Clona el repositorio**:
    ```bash
    git clone https://github.com/tu-usuario/tu-repositorio.git
    ```

2.  **Navega al directorio del proyecto**:
    ```bash
    cd tu-repositorio
    ```

3.  **Instala las dependencias**:
    ```bash
    npm install
    ```
    Esto instalará las librerías necesarias como `date-fns`, `csv-stringify` y `lodash`.

## ▶️ Uso

Para ejecutar el script, utiliza el siguiente comando en tu terminal desde la raíz del proyecto:

```bash
node index.js
```

El script te guiará con una serie de preguntas interactivas:

1.  **Introduce tu API Key de AEMET**: Pega la clave que obtuviste de AEMET.
2.  **Introduce ID(s) de estación**:
    -   Para una sola estación, escribe su ID (ej: `5530E`).
    -   Para varias, sepáralas por comas (ej: `5530E,9434X,3195H`).
    -   Puedes presionar Enter para usar el valor por defecto (`5530E`).
3.  **Introduce la fecha de inicio (DD/MM/YYYY)**: Escribe la fecha de inicio o presiona Enter para usar `01/01/1972`.
4.  **Introduce la fecha de fin (DD/MM/YYYY)**: Escribe la fecha de fin o presiona Enter para usar la fecha actual.

Una vez configurado, el script comenzará el proceso de descarga y análisis para cada estación de forma secuencial.

## 📊 Salida

Al finalizar el proceso para una estación, se creará una nueva carpeta en la raíz del proyecto con el formato: `[estacionId]_[fechaInicio]_[fechaFin]`.

Por ejemplo: `5530E_19720101_20250813`

Dentro de esta carpeta, encontrarás tres ficheros CSV:

1.  **`[estacionId]_[...].csv`**: Contiene los datos climatológicos **diarios** normalizados.
2.  **`mensuales_[...].csv`**: Contiene el **análisis mensual** con promedios, máximos y mínimos de cada mes.
3.  **`anuales_[...].csv`**: Contiene el **análisis anual** con promedios, máximos y mínimos de cada año.

## ⚖️ Licencia

Este proyecto está bajo la Licencia MIT.