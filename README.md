# Registro de ventas

Aplicación web sencilla para registrar ventas de una tienda y consultar un
resumen acumulado y ventas agrupadas por día. Está construida con Node.js,
Express, `sql.js`, HTML, CSS y JavaScript vanilla.

## Requisitos

- Node.js 20 o superior
- npm

## Instalación y ejecución

Desde la carpeta del proyecto, instala las dependencias e inicia el servidor:

```bash
npm install
npm start
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador. El puerto
está fijado en `3000` en `server.js`.

## Uso

1. La página solicita los productos al servidor y los muestra en el selector.
2. Selecciona un producto, introduce una cantidad entera mayor que cero y
   registra la venta.
3. Usa **Consultar informe** para ver la cantidad de ventas, el dinero
   recaudado y el detalle agregado por día.

## Estructura del proyecto

- `server.js`: aplicación Express, archivos estáticos y endpoints de la API.
- `database.js`: inicialización y acceso a la base de datos SQLite en memoria,
  además de su persistencia en disco.
- `index.html`: interfaz web y lógica de cliente.
- `ventas.db`: archivo SQLite persistido junto a los archivos del proyecto y
  generado por la aplicación.
- `package.json`: dependencias y comandos npm.

## Persistencia y datos

`database.js` abre `ventas.db` si existe; en caso contrario, crea una base de
datos nueva. Crea las tablas siguientes:

| Tabla | Datos principales |
| --- | --- |
| `Productos` | Identificador, nombre único y precio no negativo |
| `Ventas` | Identificador, fecha de registro y total no negativo |
| `Detalle_Ventas` | Venta, producto, cantidad positiva y subtotal |

Si `Productos` está vacía, se agregan estos productos de ejemplo:

| Producto | Precio |
| --- | ---: |
| Arroz | 2500 |
| Leche | 4200 |
| Pan | 800 |

Las operaciones SQL usan `?` como parámetros para separar los valores de las
consultas. `db.run` persiste los cambios individuales en `ventas.db`; si se
ejecuta una transacción, la persistencia se realiza al confirmar la transacción.

## API

### `GET /api/productos`

Devuelve los productos disponibles. El objeto incluye `id`, `nombre`, `precio`
y `id_producto` (este último se conserva para compatibilidad con la interfaz).

Ejemplo:

```json
[
  {
    "id": 1,
    "id_producto": 1,
    "nombre": "Arroz",
    "precio": 2500
  }
]
```

### `POST /api/ventas`

Registra una venta para un producto existente. El subtotal se calcula como
`precio × cantidad`. El cuerpo debe ser JSON:

```json
{
  "id_producto": 1,
  "cantidad": 2
}
```

Respuesta exitosa (`201 Created`):

```json
{
  "mensaje": "Venta registrada correctamente.",
  "id_venta": 1,
  "subtotal": 5000,
  "total_venta": 5000
}
```

Devuelve `400 Bad Request` si el identificador o la cantidad no son enteros
válidos o la cantidad es menor que uno. Devuelve `404 Not Found` si el producto
no existe.

### `GET /api/informe`

Devuelve el total de ventas, el total recaudado y un arreglo `ventas_por_dia`
ordenado desde la fecha más reciente:

```json
{
  "total_ventas": 1,
  "total_recaudado": 5000,
  "ventas_por_dia": [
    {
      "fecha": "2026-10-18",
      "cantidad_ventas": 1,
      "total_venta": 5000
    }
  ]
}
```

## Nota sobre archivos estáticos

El servidor configura `express.static(__dirname)`, por lo que expone por HTTP
los archivos del directorio raíz del proyecto, incluido potencialmente
`ventas.db`. Esta configuración corresponde al estado actual del código y no
es adecuada para desplegar datos reales. En un entorno de producción, sirve
únicamente una carpeta pública dedicada (por ejemplo, `public`) y mantén la
base de datos fuera de cualquier directorio estático.