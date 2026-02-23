import express from "express";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- SUPABASE CLIENT ---
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  const app = express();
  app.use(express.json());

  // --- API ROUTES ---

  app.get("/api/structure", async (req, res) => {
    try {
      if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ 
          error: "Configuración incompleta", 
          details: "Faltan las variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY." 
        });
      }

      const { data, error } = await supabase
        .from('meses')
        .select(`
          mes_id:id, numero_mes, mes_nombre:nombre,
          semanas (
            semana_id:id, numero_semana, semana_titulo:titulo, semana_closed:closed,
            actividades (
              actividad_id:id, actividad_desc:descripcion, es_critica, actividad_tipo:tipo,
              tareas (
                tarea_id:id, tarea_desc:descripcion, tarea_completada:completada,
                kpis (
                  kpi_id:id, nombre_metrica, tipo_dato, meta_objetivo, valor_actual, es_obligatorio
                ),
                evidencias_requeridas (
                  evidence_req_id:id, evidence_nombre:nombre_descriptivo, es_obligatoria, evidence_value
                )
              )
            )
          )
        `)
        .order('numero_mes', { ascending: true });

      if (error) throw error;

      const flattened: any[] = [];
      if (data) {
        data.forEach((mes: any) => {
          mes.semanas.forEach((sem: any) => {
            if (sem.actividades.length === 0) {
              flattened.push({ ...mes, ...sem });
            }
            sem.actividades.forEach((act: any) => {
              if (act.tareas.length === 0) {
                flattened.push({ ...mes, ...sem, ...act });
              }
              act.tareas.forEach((tar: any) => {
                const base = { ...mes, ...sem, ...act, ...tar };
                const kpis = tar.kpis.length > 0 ? tar.kpis : [{}];
                const evs = tar.evidencias_requeridas.length > 0 ? tar.evidencias_requeridas : [{}];
                kpis.forEach((k: any) => {
                  evs.forEach((e: any) => {
                    flattened.push({ ...base, ...k, ...e });
                  });
                });
              });
            });
          });
        });
      }

      res.json(flattened);
    } catch (error: any) {
      console.error("Supabase error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ABM Operations
  app.post("/api/abm/:entity", async (req, res) => {
    const { entity } = req.params;
    const { usuario, ...fields } = req.body;
    try {
      const { data, error } = await supabase.from(entity).insert(fields).select().single();
      if (error) throw error;
      await supabase.from('auditoria_abm').insert({
        entidad_tipo: entity,
        entidad_id: data.id,
        accion: 'CREATE',
        valores_nuevos: fields,
        usuario: usuario || 'admin'
      });
      res.json({ id: data.id, message: "Created successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/abm/:entity/:id", async (req, res) => {
    const { entity, id } = req.params;
    const { usuario, ...fields } = req.body;
    
    // Ensure ID is a clean integer
    const cleanId = parseInt(id.toString().split(':')[0]);

    try {
      const { error } = await supabase.from(entity).update(fields).eq('id', cleanId);
      if (error) throw error;

      await supabase.from('auditoria_abm').insert({
        entidad_tipo: entity,
        entidad_id: cleanId,
        accion: 'UPDATE',
        valores_nuevos: fields,
        usuario: usuario || 'admin'
      });

      res.json({ message: "Updated successfully" });
    } catch (error: any) {
      console.error(`Error updating ${entity}:`, error);
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/abm/:entity/:id", async (req, res) => {
    const { entity, id } = req.params;
    const { usuario, razon } = req.query;
    try {
      const { error } = await supabase.from(entity).delete().eq('id', id);
      if (error) throw error;
      await supabase.from('auditoria_abm').insert({
        entidad_tipo: entity,
        entidad_id: parseInt(id),
        accion: 'DELETE',
        razon_cambio: razon as string,
        usuario: (usuario as string) || 'admin'
      });
      res.json({ message: "Deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/weeks/:id/close", async (req, res) => {
    const { id } = req.params;
    try {
      const { error } = await supabase.from('semanas').update({ closed: true }).eq('id', id);
      if (error) throw error;
      res.json({ message: "Week closed" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Vite middleware ONLY in development
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving (for local production testing)
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  if (process.env.NODE_ENV !== "production" || (process.env.VERCEL !== "1" && !process.env.LAMBDA_TASK_ROOT)) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  
  return app;
}

export default startServer();
