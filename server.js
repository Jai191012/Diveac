const express = require('express');
const dbPromise = require('./database.js');

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/api/productos', async (request, response) => {
  const db = await dbPromise;
  const productos = await db.all(
    'SELECT id_producto AS id, nombre, precio FROM Productos'
  );

  response.json(productos.map((producto) => ({
    ...producto,
    id_producto: producto.id
  })));
});

app.post('/api/ventas', async (request, response) => {
  const { id_producto: productId, cantidad: quantity } = request.body ?? {};

  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
    return response.status(400).json({
      error: 'Selecciona un producto y una cantidad entera mayor que cero.'
    });
  }

  const db = await dbPromise;
  const producto = await db.get(
    'SELECT id_producto, precio FROM Productos WHERE id_producto = ?',
    [productId]
  );

  if (!producto) {
    return response.status(404).json({
      error: 'El producto seleccionado no existe.'
    });
  }

  const subtotal = producto.precio * quantity;
  let saleId;

  const insertSale = () => {
    saleId = db.run(
      'INSERT INTO Ventas (total_venta) VALUES (?)',
      [subtotal]
    );

    db.run(
      `INSERT INTO Detalle_Ventas
        (id_venta, id_producto, cantidad, subtotal)
       VALUES (?, ?, ?, ?)`,
      [saleId, producto.id_producto, quantity, subtotal]
    );
  };

  if (typeof db.transaction === 'function') {
    await db.transaction(insertSale);
  } else {
    insertSale();
  }

  response.status(201).json({
    mensaje: 'Venta registrada correctamente.',
    id_venta: saleId,
    subtotal,
    total_venta: subtotal
  });
});

app.get('/api/informe', async (request, response) => {
  const db = await dbPromise;
  const resumen = await db.get(`
    SELECT COUNT(*) AS total_ventas,
           COALESCE(SUM(total_venta), 0) AS total_recaudado
    FROM Ventas
  `);

  const ventasPorDia = await db.all(`
    SELECT date(fecha) AS fecha,
           COUNT(*) AS cantidad_ventas,
           SUM(total_venta) AS total_venta
    FROM Ventas
    GROUP BY date(fecha)
    ORDER BY fecha DESC
  `);

  response.json({
    ...resumen,
    ventas_por_dia: ventasPorDia
  });
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Aplicacion disponible en http://localhost:${PORT}`);
});
