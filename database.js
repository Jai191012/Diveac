const fs = require('node:fs');
const path = require('node:path');
const initializeSqlJs = require('sql.js');

const databasePath = path.join(__dirname, 'ventas.db');

const databasePromise = initializeSqlJs().then((SQL) => {
  const database = fs.existsSync(databasePath)
    ? new SQL.Database(fs.readFileSync(databasePath))
    : new SQL.Database();

  database.run('PRAGMA foreign_keys = ON');
  database.run(`
    CREATE TABLE IF NOT EXISTS Productos (
      id_producto INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      precio REAL NOT NULL CHECK (precio >= 0)
    );

    CREATE TABLE IF NOT EXISTS Ventas (
      id_venta INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      total_venta REAL NOT NULL CHECK (total_venta >= 0)
    );

    CREATE TABLE IF NOT EXISTS Detalle_Ventas (
      id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
      id_venta INTEGER NOT NULL,
      id_producto INTEGER NOT NULL,
      cantidad INTEGER NOT NULL CHECK (cantidad > 0),
      subtotal REAL NOT NULL CHECK (subtotal >= 0),
      FOREIGN KEY (id_venta) REFERENCES Ventas (id_venta),
      FOREIGN KEY (id_producto) REFERENCES Productos (id_producto)
    );
  `);

  const persist = () => {
    fs.writeFileSync(databasePath, Buffer.from(database.export()));
  };

  const productCount = database.exec(
    'SELECT COUNT(*) AS total FROM Productos'
  )[0].values[0][0];

  if (productCount === 0) {
    database.run('BEGIN');
    try {
      database.run('INSERT INTO Productos (nombre, precio) VALUES (?, ?)', ['Arroz', 2500]);
      database.run('INSERT INTO Productos (nombre, precio) VALUES (?, ?)', ['Leche', 4200]);
      database.run('INSERT INTO Productos (nombre, precio) VALUES (?, ?)', ['Pan', 800]);
      database.run('COMMIT');
    } catch (error) {
      database.run('ROLLBACK');
      throw error;
    }
  }

  persist();

  const query = (sql, parameters = []) => {
    const statement = database.prepare(sql);
    try {
      statement.bind(parameters);
      const rows = [];
      while (statement.step()) {
        rows.push(statement.getAsObject());
      }
      return rows;
    } finally {
      statement.free();
    }
  };

  let inTransaction = false;

  return {
    all: query,
    get: (sql, parameters = []) => query(sql, parameters)[0],
    transaction: (callback) => {
      database.run('BEGIN');
      inTransaction = true;
      let result;
      try {
        result = callback();
        database.run('COMMIT');
      } catch (error) {
        database.run('ROLLBACK');
        throw error;
      } finally {
        inTransaction = false;
      }
      persist();
      return result;
    },
    run: (sql, parameters = []) => {
      database.run(sql, parameters);
      const insertId = database.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
      if (!inTransaction) {
        persist();
      }
      return insertId;
    }
  };
});

module.exports = databasePromise;
