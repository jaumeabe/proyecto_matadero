import { neon } from '@neondatabase/serverless'

export function getDb() {
  const sql = neon(process.env.DATABASE_URL!)
  return sql
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS previsiones (
  id SERIAL PRIMARY KEY,
  semana INT NOT NULL,
  anio INT NOT NULL,
  granja VARCHAR(255) NOT NULL,
  codigo_granja VARCHAR(20) NOT NULL,
  no_registro VARCHAR(50) NOT NULL,
  peso_125_130 INT DEFAULT 0,
  peso_120_125 INT DEFAULT 0,
  peso_115_120 INT DEFAULT 0,
  peso_110_115 INT DEFAULT 0,
  peso_105_110 INT DEFAULT 0,
  peso_100_105 INT DEFAULT 0,
  peso_95_100 INT DEFAULT 0,
  peso_menos_95 INT DEFAULT 0,
  saldos INT DEFAULT 0,
  cerdos_prevision INT DEFAULT 0,
  num_camiones DECIMAL(5,1) DEFAULT 0,
  vaciado VARCHAR(3) DEFAULT 'No',
  observaciones TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`
