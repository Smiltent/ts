
import type { DrawingRecord } from "../types/types"
import Database from "bun:sqlite"

export default class DatabaseService {
    private database: Database
    private drawing: DrawingRecord = { ops: [], strokes: [] }

    constructor(private dbFile: string) {
        this.database = new Database(this.dbFile)
        this.database.run(`
            CREATE TABLE IF NOT EXISTS drawings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL
            )
        `)

        const row = this.database.query("SELECT data FROM drawings WHERE id = 1").get() as { data: string } | null
        this.drawing = row ? JSON.parse(row.data) : { ops: [], strokes: [] }
    }

    public getDrawing(): DrawingRecord { return this.drawing }
    public saveDrawing(drawing: DrawingRecord): Boolean {
        const merged: DrawingRecord = {
            ops: [...this.drawing.ops, ...drawing.ops],
            strokes: drawing.strokes 
        }

        this.drawing = merged
        const stmt = this.database.prepare("INSERT OR REPLACE INTO drawings (id, data) VALUES (1, ?)")
        const result = stmt.run(JSON.stringify(merged))
        return result.changes > 0
    }
}